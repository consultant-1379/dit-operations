#!/usr/bin/env python
"""Clean out schemas and managed configs that are more than the given days old."""
import argparse
import urlparse
import logging
import requests
from datetime import datetime, timedelta

LOG = logging.getLogger(__name__)
logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)


def main():
    """The main function."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--dit-base-url',
        help="""This is the url to the deployment inventory tool""",
        required=True
    )
    parser.add_argument(
        '--snapshot-retention-days',
        help="""This is the number of days of snapshots that you want to retain""",
        required=True,
        type=int
    )
    args = parser.parse_args()

    documents_url = urlparse.urljoin(args.dit_base_url, "/api/documents/")
    schemas_url = urlparse.urljoin(args.dit_base_url, "/api/schemas/")

    managedconfigs_response = execute_dit_get_rest_call(
        url_string=documents_url,
        payload={'fields': '_id,name,schema_id,created_at',
                 'q': 'managedconfig=true'}
    )

    schemas_response = execute_dit_get_rest_call(
        url_string=schemas_url,
        payload={'fields': '_id,name,version,created_at'}
    )

    managedconfigs = populate_document_objects_with_schema_version(schemas_response, managedconfigs_response)
    snapshot_managedconfigs = reduce_to_snapshot_versions_only(managedconfigs)
    snapshot_managedconfigs.sort(key=lambda managedconfig: managedconfig.get('created_at'), reverse=True)

    snapshot_schemas = reduce_to_snapshot_versions_only(schemas_response)
    snapshot_schemas.sort(key=lambda schema: schema.get('created_at'), reverse=True)

    valid_timestamp = get_required_timestamp(less_days=args.snapshot_retention_days)
    readable_timestamp = valid_timestamp.strftime("%B %d, %Y, %H:%M")

    LOG.info("Deleting managedconfigs uploaded to DIT before %s", readable_timestamp)
    deleted_mc_count = delete_older_than_given_time(documents_url, snapshot_managedconfigs, valid_timestamp)

    LOG.info("Deleting schemas uploaded to DIT before %s", readable_timestamp)
    deleted_schemas_count = delete_older_than_given_time(schemas_url, snapshot_schemas, valid_timestamp)

    LOG.info("Deleted %s managedconfigs from DIT", str(deleted_mc_count))
    LOG.info("Deleted %s schemas from DIT", str(deleted_schemas_count))


def get_schema_for_document(schemas, document):
    """Return the schema object related to the document"""
    return next((schema for schema in schemas if schema.get('_id') == document.get('schema_id')), None)


def populate_document_objects_with_schema_version(schemas, documents):
    """Populate the document object with the version of the schema it uses"""
    for document in documents:
        schema = get_schema_for_document(schemas, document)
        if schema:
            document['version'] = schema.get('version')
    return documents


def reduce_to_snapshot_versions_only(values):
    """Return a filtered version of the schemas/documents with just SNAPSHOTS"""
    return filter(lambda value: "-SNAPSHOT" in value.get('version'), values)


def get_required_timestamp(less_days):
    """Return the timestamp for now minus the number of days passed into the less_days param"""
    return datetime.now() - timedelta(days=less_days)


def delete_older_than_given_time(rest_url, values, valid_timestamp):
    """Execute the DELETE rest call for all SNAPSHOT schemas/documents in DIT that are more than given days old."""
    deletion_counter = 0
    for item in values:
        check_time = datetime.strptime(item.get('created_at'), '%Y-%m-%dT%H:%M:%S.%fZ')
        if check_time > valid_timestamp:
            break
        elif check_time < valid_timestamp:
            is_success = execute_dit_delete_rest_call(rest_url, item.get('_id'))[1]
            if is_success:
                deletion_counter += 1
                LOG.info("Deleted %s-%s from DIT", item.get('name'), item.get('version'))
    return deletion_counter


def execute_dit_get_rest_call(url_string, payload=None):
    """Return the result of a GET REST call towards the deployment inventory tool."""
    LOG.info(
        "Running GET REST call towards the Deployment Inventory Tool (%s %s)",
        url_string,
        "with payload " + str(payload) if payload else ""
    )
    logging.getLogger("requests").setLevel(logging.WARNING)
    response = requests.get(url_string, params=payload)
    response.raise_for_status()
    LOG.info("REST call completed")
    return response.json()


def execute_dit_delete_rest_call(url_string, object_to_delete):
    """Return the result of a DELETE REST call towards the deployment inventory tool."""
    full_url = urlparse.urljoin(url_string, object_to_delete)
    LOG.info("Running DELETE REST call towards the Deployment Inventory Tool (%s)", full_url)
    logging.getLogger("requests").setLevel(logging.WARNING)
    response = requests.delete(full_url)
    if response.status_code != 200:
        return response.json(), False
    LOG.info("REST call completed")
    return response.json(), True


if __name__ == "__main__":
    main()
