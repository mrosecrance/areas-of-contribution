function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function getUserEmail() {
  return Session.getActiveUser().getEmail();
}

function getFormAndSheetMetadata(feedbackFormUrl) {
  var form = FormApp.openByUrl(feedbackFormUrl);
  var sheet = SpreadsheetApp.openById(form.getDestinationId());
  return {
    formTitle: form.getTitle(),
    sheetTitle: sheet.getName(),
  };
}

function doGet(e) {
  return HtmlService.createTemplateFromFile('frontend/index').evaluate().setTitle("Form/Sheet Updater");
}

function getCurrentState(feedbackFormUrl) {
  const form = FormApp.openByUrl(feedbackFormUrl);
  const spreadsheet = SpreadsheetApp.openById(form.getDestinationId());
  
  return {
    responsesSheet: getResponsesSheet_(form, spreadsheet),
    form: getForm_(form),
  };
}