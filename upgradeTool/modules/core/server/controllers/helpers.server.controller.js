
var nodemailer = require('nodemailer'),
  JiraClient = require('jira-connector'),
  logger = require('../../../../config/lib/logger');

var mailTransporter = nodemailer.createTransport({
  host: 'smtp-central.internal.ericsson.com',
  port: 25,
  secure: false, // true for 465, false for other ports
  tls: { rejectUnauthorized: false } // dont check certificate trust
});

module.exports.asyncForEach = async function (array, callBack) {
  for (var i = 0; i < array.length; i += 1) {
    await callBack(array[i], i, array); //eslint-disable-line
  }
};

module.exports.sendMail = async function (email) {
  try {
    // Send email
    await mailTransporter.sendMail(email);
  } catch (emailError) {
    // Do Nothing -> Email failure should not affect CRUD operation
    logger.info(`Error whilst sending Email: ${emailError}`);
  }
};

module.exports.getJiraClient = function () {
  let buff = Buffer.from(`${process.env.UPGRADE_TOOL_USERNAME}:${process.env.JIRA_PASSWORD}`);
  var auth = buff.toString('base64');
  var jira = new JiraClient({
    host: process.env.JIRA_HOST,
    basic_auth: {
      base64: auth
    }
  });
  return jira;
};

module.exports.getEmailCss = function () {
  // eslint-disable-next-line no-useless-escape
  return `
  <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
  xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta name=Generator content="Microsoft Word 15 (filtered medium)">
    <!--[if !mso]>
      <style>v:* {behavior:url(#default#VML);}
  o:* {behavior:url(#default#VML);}
  w:* {behavior:url(#default#VML);}
  .shape {behavior:url(#default#VML);}
  </style>
      <![endif]-->
    <style>
      <!--
      /* Font Definitions */
      @font-face {
        font-family: "Cambria Math";
        panose-1: 2 4 5 3 5 4 6 3 2 4;
      }
      @font-face {
        font-family: Calibri;
        panose-1: 2 15 5 2 2 2 4 3 2 4;
      }
      @font-face {
        font-family: "Ericsson Hilda";
        panose-1: 0 0 5 0 0 0 0 0 0 0;
      }
      h2 {
        font-family: "Ericsson Hilda";
        color: black;
      }
      /* Style Definitions */
      p.MsoNormal,
      li.MsoNormal,
      div.MsoNormal {
        margin: 0in;
        font-size: 11.0pt;
        font-family: "Calibri", sans-serif;
      }
      a:link,
      span.MsoHyperlink {
        mso-style-priority: 99;
        color: #0563C1;
        text-decoration: underline;
      }
      .MsoChpDefault {
        mso-style-type: export-only;
        font-size: 10.0pt;
      }
      @page WordSection1 {
        size: 8.5in 11.0in;
        margin: 70.85pt 70.85pt 70.85pt 70.85pt;
      }
      div.WordSection1 {
        page: WordSection1;
      }
      #box {
        background-color: #AF78D2;
      }
      img {
        float: left;
        margin: 0 15px 0 0;
        width: 45pt;
        height: 47pt;
      }
      -->
    </style>
    <!--[if gte mso 9]>
      <xml>
        <o:shapedefaults v:ext="edit" spidmax="1026" />
      </xml>
      <![endif]-->
    <!--[if gte mso 9]>
      <xml>
        <o:shapelayout v:ext="edit">
          <o:idmap v:ext="edit" data="1" />
        </o:shapelayout>
      </xml>
      <![endif]-->
  </head>
  <body lang=EN-US link="#0563C1" vlink="#954F72" style='word-wrap:break-word'>
    <div class=WordSection1>
      <div align=center>
        <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 width="100%" style='width:100.96%;background:#E0E0E0'>
          <tr>
            <td width=1901 style='width:1425.8pt;padding:0in 0in 0in 0in'>
              <div align=center>
                <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 width=644 style='width:483.0pt;background:#FAFAFA'>
                  <tr>
                    <td width=644 colspan=3 style='width:483.0pt;padding:0in 0in 0in 0in'>
                      <div id=box>
                      <img src="cid:uniqueTwo@ericsson.com" style="margin:auto; width:150px;display:block" />
                        </div><br>
                        <div>`;
};


module.exports.getHtmlAfterEmailHeader = function () {
  return `<tr style='height:15.0pt'>
  <td width=32 style='width:24.15pt;padding:0in 0in 0in 0in;height:15.0pt'>
    <p class=MsoNormal style='line-height:15.0pt'>
      <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
      <span style='font-size:10.0pt;font-family:"Arial",sans-serif'>
        <o:p></o:p>
      </span>
    </p>
  </td>
  <td width=592 style='width:443.85pt;padding:0in 0in 0in 0in;height:15.0pt'>
    <p class=MsoNormal style='line-height:15.0pt'>
      <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
      <span style='font-size:10.0pt;font-family:"Arial",sans-serif;mso-fareast-language:GA'>
        <o:p></o:p>
      </span>
    </p>
  </td>
  <td width=20 style='width:15.0pt;padding:0in 0in 0in 0in;height:15.0pt'>
    <p class=MsoNormal style='line-height:15.0pt'>
      <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
      <span style='font-size:10.0pt;font-family:"Arial",sans-serif'>
        <o:p></o:p>
      </span>
    </p>
  </td>
</tr>
<tr>
  <td width=32 valign=top style='width:24.15pt;padding:0in 0in 0in 0in'>
    <p class=MsoNormal style='text-align:justify'>
      <span style='font-size:10.5pt;font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
      <span style='font-size:10.5pt;font-family:"Arial",sans-serif'>
        <o:p></o:p>
      </span>
    </p>
  </td>
  <td width=592 valign=top style='width:443.85pt;padding:0in 0in 0in 0in'>
    <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 width=600 style='width:6.25in'>
      <tr>
        <td valign=top style='padding:0in 0in 0in 0in'>
          <div align=center>
            <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 width=593 style='width:444.8pt;background:#FAFAFA'>
              <tr style='height:6.3pt'>
                <td width=593 style='width:444.8pt;padding:0in 5.4pt 0in 5.4pt;height:6.3pt'>
                  <p class=MsoNormal>
                    <span style='font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
                    <span style='font-family:"Arial",sans-serif'>
                      <o:p></o:p>
                    </span>
                  </p>
                </td>
              </tr>
              <tr style='height:6.3pt'>
                <td width=593 style='width:444.8pt;padding:0in 0in 0in 0in;height:6.3pt'>
                  <p class=MsoNormal>
                      <b>
                        <span style='font-family:"Ericsson Hilda";color:black'>`;
};

module.exports.getHtmlBeforeEmailCommits = function () {
  return `
  <p class=MsoNormal>
  <span style='font-family:"Ericsson Hilda"'>
  <o:p>&nbsp;</o:p>
  </span>
  </p>
  <p class=MsoNormal>
  <ul>`;
};

module.exports.getEmailEndHtml = function () {
  return `<p class=MsoNormal style='margin-bottom:12.0pt'>
  <span style='font-family:"Ericsson Hilda";color:black'>Best Regards,</span>
  <span style='font-family:"Ericsson Hilda"'>
    <o:p></o:p>
  </span>
  </p>
  <p class=MsoNormal style='margin-bottom:12.0pt'>
  <span style='font-family:"Ericsson Hilda";color:black'>Tools Team,</span>
  <span style='font-family:"Ericsson Hilda"'>
    <o:p></o:p>
  </span>
  </p>
  <p class=MsoNormal style='margin-bottom:12.0pt'>
  <span style='font-family:"Ericsson Hilda";color:black'>Development Environment</span>
  <span style='font-family:"Arial",sans-serif'>
    <o:p></o:p>
  </span>
  </p>
  </td>
  </tr>
  </table>
  </div>
  </td>
  </tr>
  </table>
  </td>
  <td width=20 valign=top style='width:15.0pt;padding:0in 0in 0in 0in'>
  <p class=MsoNormal style='line-height:12.0pt'>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif'>
  <o:p></o:p>
  </span>
  </p>
  </td>
  </tr>
  <tr style='height:15.0pt'>
  <td width=32 style='width:24.15pt;padding:0in 0in 0in 0in;height:15.0pt'>
  <p class=MsoNormal style='line-height:15.0pt'>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif;mso-fareast-language:GA'>
  <o:p></o:p>
  </span>
  </p>
  </td>
  <td width=592 style='width:443.85pt;padding:0in 0in 0in 0in;height:15.0pt'></td>
  <td width=20 style='width:15.0pt;padding:0in 0in 0in 0in;height:15.0pt'>
  <p class=MsoNormal style='line-height:15.0pt'>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:black'>&nbsp;</span>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif'>
  <o:p></o:p>
  </span>
  </p>
  </td>
  </tr>
  <tr>
  <td width=644 colspan=3 style='width:483.0pt;border:solid #E0E0E0 1.0pt;padding:0in 0in 0in 0in'></td>
  </tr>
  <tr style='height:15.0pt'>
  <td width=644 colspan=3 style='width:483.0pt;background:#181818;padding:0in 0in 0in 0in;height:15.0pt'></td>
  </tr>
  <tr>
  <td width=32 style='width:24.15pt;background:#181818;padding:0in 0in 0in 0in'>
  <p class=MsoNormal style='line-height:12.0pt'>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:white'>&nbsp; <o:p></o:p>
  </span>
  </p>
  </td>
  <td width=592 valign=top style='width:443.85pt;background:#181818;padding:0in 0in 0in 0in'>
  <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 width=600 style='width:6.25in'>
  <tr>
  <td width=135 valign=top style='width:101.25pt;padding:0in 0in 0in 0in'>
  <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 align=left width=25 style='width:18.75pt'>
  <tr>
  <td valign=top style='padding:0in 0in 0in 0in'></td>
  </tr>
  </table>
  <p class=MsoNormal>
  <a href="https://www.ericsson.com/en">
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:blue;mso-fareast-language:HU;text-decoration:none'>
  <img border=0 width=31 height=43 style='width:.3229in;height:.4479in' id="Picture_x0020_2" src="cid:unique@ericsson.com" alt=Ericsson>
  </span>
  </a>
  <o:p></o:p>
  </p>
  </td>
  <td width=20 style='width:15.0pt;padding:0in 0in 0in 0in'></td>
  <td width=445 valign=top style='width:333.75pt;padding:0in 0in 0in 0in'>
  <div align=center>
  <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 width=445 style='width:333.75pt'>
  <tr>
  <td style='padding:0in 0in 0in 0in'></td>
  </tr>
  <tr style='height:7.5pt'>
  <td style='padding:0in 0in 0in 0in;height:7.5pt'>
  <p class=MsoNormal style='mso-line-height-alt:7.5pt'>
  <b>
    <span style='font-size:10.0pt;font-family:"Arial",sans-serif'>
      <o:p>&nbsp;</o:p>
    </span>
  </b>
  </p>
  </td>
  </tr>
  </table>
  </div>
  <p class=MsoNormal align=center style='text-align:center'>For questions, queries or comments, see contact details. <o:p></o:p>
  </p>
  <p class=MsoNormal align=center style='text-align:center'>&nbsp; <o:p></o:p>
  </p>
  </td>
  </tr>
  </table>
  </td>
  <td width=20 style='width:15.0pt;background:#181818;padding:0in 0in 0in 0in'>
  <p class=MsoNormal style='line-height:12.0pt'>
  <span style='font-size:10.0pt;font-family:"Arial",sans-serif;color:white'>&nbsp; <o:p></o:p>
  </span>
  </p>
  </td>
  </tr>
  <tr style='height:15.0pt'>
  <td width=644 colspan=3 style='width:483.0pt;background:#181818;padding:0in 0in 0in 0in;height:15.0pt'></td>
  </tr>
  </table>
  </div>
  </td>
  </tr>
  </table>
  </div>
  <br><br>
  </div>`;
};

module.exports.getRefactoredEmailStartHtml = function () {
  return `<hr>
  <div>
    <h2 style="text-align:center">`;
};

module.exports.getRefactoredPostHeaderHtml = function () {
  return `</h2>
  <hr>
  <p>
  <h4>UPDATES:</h4>
  <ul>`;
};

module.exports.getRefactoredBeforeChangeHtml = function () {
  return `</ul>
  </p>
</div>
<p>
<h4>CHANGE LOG:</h4>`;
};

module.exports.getRefactoredChangeHtml = function () {
  return `<ul>
  <li>
    <a href="`;
};
module.exports.getRefactoredAfterChangeHtml = function () {
  return ` Change log</a></li>
  </ul>`;
};


module.exports.getRefactoredBeforeSmHtml = function () {
  return `<br>
  <p>
  <h5>Contact for more information:</h5>
  <strong>SM: `;
};

module.exports.getRefactoredEndEmailHtml = function () {
  return `<strong>Jira: </strong>
  <a href="https://${process.env.JIRA_HOST}/browse/ETTS-12185">Tools Team - JIRA Template </a>
      <br>
      </p>
      <br>
      <hr>`;
};
