FROM python:2.7.14-alpine3.7

WORKDIR /src/

COPY requirements.txt /src/requirements.txt

RUN pip install -r requirements.txt

COPY scripts/ /src/

ENTRYPOINT ["./cleanup_old_schemas_and_docs.py"]
