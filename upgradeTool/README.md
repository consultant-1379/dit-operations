# Tools Team Upgrade Tool
-----------------------------------------------
This tool is used to upgrade all Tools Team tools from a single location.

Currently supports:
- Deployment Tracking Tool (DTT)
- Deployment Inventory Tool (DIT)
- DE Object Store Tool (OST)
- OpenStack Queuing Solution (OQS)

# Prerequisites #

## Setting up Linux on VirtualBox ##

Download VirtualBox for Windows: https://www.virtualbox.org/

Download Linux Distribution ISO of your choice.

Disable Hyper-V: https://ugetfix.com/ask/how-to-disable-hyper-v-in-windows-10/

Install Linux in VirtualBox: https://itsfoss.com/install-linux-in-virtualbox/

You can enable copy/paste across Windows/Ubuntu:
> Devices -> Insert Guest Additions CD Image

> Machine -> Settings -> General -> Advanced -> Turn Shared Clipboard and Drag'n'Drop to Bindirectional

# Setting up Docker-Compose and Docker ##

Install curl:
`sudo apt-get install curl`

Install Docker-Compose:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
sudo curl -L "https://github.com/docker/compose/releases/download/1.23.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To verify Docker-Compose installation:
`docker-compose --version`

Install Docker:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
sudo apt-get update
sudo apt-get install \apt-transport-https \ca-certificates \curl \gnupg-agent \software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository \ "deb [arch=amd64] https://download.docker.com/linux/ubuntu \ $(lsb_release -cs) \stable
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To verify Docker installation:
`sudo docker run hello-world`

To run Docker without sudo:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
sudo groupadd docker
sudo gpasswd -a $USER docker
sudo service docker restart
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

## Setting up Gerrit and Installing Git ##

Install Git: `sudo apt install git`

Generate ssh keys: `ssh-keygen -t rsa`

Get file: `cat ~/.ssh/id_rsa.pub`

Login to Gerrit:
> Log-in -> Settings -> SSH Publick Key -> Paste the key and "Add"

Copy the content inside the file id_rsa.pub and paste it to Gerrit

# .env Variables #

Before running the project in development mode, the .env file is required at the root of the project with the following contents:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
LDAP_URL=LDAPS://ldap-egad.internal.ericsson.com:3269
BASE_DN_LIST=OU=CA,OU=User,OU=P001,OU=ID,OU=Data,DC=ericsson,DC=se:OU=External,OU=P017,OU=ID,OU=Data,DC=ericsson,DC=se:OU=CA,OU=SvcAccount,OU=P001,OU=ID,OU=Data,DC=ericsson,DC=se
SEARCH_FILTER=(name={{username}})
UPGRADE_TOOL_USERNAME=DTTADM100
UPGRADE_TOOL_EMAIL_ADDRESS=no-reply-tools-team-upgrade-tool@ericsson.com
UPGRADE_TOOL_EMAIL_PASSWORD=430ea905206e5b727d6f94cf2c83c476
JIRA_HOST=jira-oss.seli.wh.rnd.internal.ericsson.com
JIRA_PASSWORD=Hilstfsr3v1ZSfQ67H92
MONGO_USERNAME=root
MONGO_PASS=roott
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

# Deployment (Development) #

Run run.sh:
`./cd dit-operations/upgradeTool/run.sh development`

To verify: Navigate to 'localhost' and hit enter

To stop process: Ctrl+C in the terminal

Import the latest DB:
`./tests/import_latest_DB.sh upgradetooldevelopment_default live`

In home.client.controller change host variable to your VM's IP address.

You either run the script for cloning Tools:
`./cloneTools.sh` or go to UI http://<your_vm>/tools and click the button 'Clone All Tools'

# Deployment (Production) #

ssh root@atvts2716.athtem.eei.ericsson.se

Go to dit-operations folder:
`cd dit-operations`

Run the following script:
`./upgrade_the_upgrade_tool.sh`

This script will run the following:
- Build containers using docker compose
- Bring up containers using docker compose in detached mode, will not see the logs in console.
- Then checks to see if UT's UI/Client Side is accessible, once the UT is ready it will:
- Update database with latest backup. (this might need looked at again if ever changing server/vm for the UT)
- Use the UT API to clone all the Tools repos.

Note: Below might of changed:
Then log into the UT http://atvts2716.athtem.eei.ericsson.se/

# Database Backup (Production) #

Set up a cron on the Production server to backup the database every 2 hours.
As root user edit crontab file:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
crontab -e
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Add:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
0 */2 * * * bash -c "~/dit-operations/upgradeTool/create_mongodb_backup.sh"
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

# Tool Information Content #

When adding a new Tool or updating a Tool:

| Field                         | Value                                                                                                                   | Comment                                                                                                                                                                                                                                                                  |
|-------------------------------|-------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| name                          | i.e 'booking-tool'                                                                                                      | Same as core repo name                                                                                                                                                                                                                                                   |
| toolEmailName (Official Name) | i.e 'Deployment Tracking Tool'                                                                                          | This used when sending out Planned/Completed email for upgrade                                                                                                                                                                                                           |
| toolUrl                       | i.e 'atvdtt.athtem.eei.ericsson.se'                                                                                     | Hostname of url                                                                                                                                                                                                                                                          |
| repo                          | i.e 'com.ericsson.de/booking-tool'                                                                                      | Core section of repo location in gerrit (the rest url will be filled in by the cloneTools.sh used for cloning all tools provided in the database)                                                                                                                        |
| folderPath                    | i.e '/booking-tool/booking-tool'                                                                                        | Folder path of gerrit repo on the Production server (must have forward slash '/' in front of folder name)                                                                                                                                                                |
| changeLogUrl                  | i.e 'https://arm1s11-eiffel004.eiffel.gic.ericsson.se:8443/nexus/content/sites/tor/booking-tool/latest/change_log.html' | Full url for the changelog in arm1s11 Nexus                                                                                                                                                                                                                              |
| grafanaDashboardUrl           | i.e 'http://141.137.232.253:3000/d/GUumblI4z/docker-containers?orgId=1&refresh=10s'                                     | Full url for the Grafana Monitoring. Dashboard                                                                                                                                                                                                                          |
| notification enabled          | Tick the check box to enable, untick to disable                                                                         | To enable the notifications. For more info see **Notifications** section.                                            |
| notifications                 | Message for the Tool's notifications                                                                                    | Leave blank as this only for Live (production) version to notify users of up coming change, issues or downtime of the Tool. For more info see **Notifications** section.                                                                                                                                                    |
| notification start            | Enter datetime (Datetime Picker)                                                                                        | To set start datetime for the notifications, used in the functionality to know when to start displaying the notifications on the Tool. For more info see **Notifications** section.                            |
| notification end              | Enter datetime (Datetime Picker), that must be after the **notification start** datetime                                | To set end datetime for the notifications, used in the functionality to know when to stop displaying the notifications on the Tool. For more info see **Notifications** section.                                           |
| notification JIRA Issue       | Provide a vaild JIRA Issue number i.e 'CIP-45650'                                                                       | Linked at the end of the notifications's message when displaying on the Tool, in the form of a button with the text **Info**. The JIRA Issue's status can be used to know when to stop displaying the notifications. For more info see **Notifications** section.                                            |
| ci (Continuous Integration)   | Tick the check box to enable, untick to disable                                                                         | For Auto Upgrade of the tool, this will:<br />1. Checks for any latest unreleased versions comparing what is the current version in Production.<br />2. Send Planned Email, (Day before upgrade).<br />3. Upgrade the Tool.<br />4. Send Completed Email if successful.  |
| recipients (list)             | Valid Email Address(es)                                                                                                 | Email of Teams/People who need know about the Upgrade of the Tool                                                                                                                                                                                                        |

# Contact Information Content #

Only one entry is allowed, this for the Upgrade Tool's Emails:

| Field             | Value                                                                     | Comment                                                                              |
|-------------------|---------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| Team              | i.e 'Tools Team'                                                          | This used in Contact Information in Planned & Completed upgrade/downgrade emails     |
| Team Email        | i.e 'PDLEERINGP@pdl.internal.ericsson.com'                                | This used in all Upgrade Tool's emails, very important.                              |
| Scrum Master      | Select person from dropdown i.e 'Judy Taylor'                             | Requires the User to log into the Upgrade Tool before they available to be selected. |
| Product Owner     | Select person from dropdown i.e 'James Furey'                             | Requires the User to log into the Upgrade Tool before they available to be selected. |
| JIRA Template Url | i.e 'https://jira-oss.seli.wh.rnd.internal.ericsson.com/browse/ETTS-12185' | This used in Contact Information in Planned & Completed upgrade/downgrade emails.    |

# Notifications #

To add notification for a Tool:
1. Go to the Edit View for a Tool.
2. Add notification message in the input field **Notifications**
3. Add 'From' and 'To' Datetime in the input fields **Notification Start** and **Notification End**
**Note**:
   Based on current time in between the Notification Start and End time, The Notification status will be
   enabled automatically and the Notification will be set disabled automatically after the Notification End.
   After 48 hours the Notification Data of expired/disabled Notification will be removed
4. Add JIRA Issue in the input field **Notification JIRA Issue**, click off the field and will validate the issue. **Note**: If the issue has status other than **Closed**, the **Notification Enabled** will automatically be checked.
5. Click **Save** button.

As long as **Notification Enabled** is true the notification will appear on the updated Tool's Production Version.

The variable value will be set to false automatically:
- If the JIRA is **Closed** before Upgrade as will set value after the Upgrade process.
- The 30 minute check to see if the JIRA Issue is **Closed**.

For any reason that there is an issue with JIRA or the Upgrade in which the JIRA Issue was delivered, the **Notification Enabled** can be set true/false manually.
**Note**: If set true manually, on JIRA the Issue will to need set back to status other than **Closed** to stop the 30 minute check from disabling the notification.

# Built With #

- [MEAN.js](http://meanjs.org) - Open-Source Full-Stack Solution For MEAN Applications
- [Angular Schema Form](https://github.com/json-schema-form/angular-schema-form) - Generate forms from a JSON schema, with AngularJS

# Authors #

**Tools Team** - PDLEERINGP@pdl.internal.ericsson.com

# License #

ERICSSON 2019
