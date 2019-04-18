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

// step 2
function getCurrentState(feedbackFormUrl) {
  const form = FormApp.openByUrl(feedbackFormUrl);
  const spreadsheet = SpreadsheetApp.openById(form.getDestinationId());
  
  return {
    responsesSheet: getResponsesSheet_(form, spreadsheet),
    form: getForm_(form),
  };
}

// step 4
function updateForm(updateSpec) {
  const form = FormApp.openByUrl(updateSpec.formUrl);
  const edits = updateSpec.edits;
  // find existing linked response sheet
  // unlink form from sheet
  // update form with these edits
  // re-link form to sheet
  // find new linked sheet
  // extract column headers
  // return name & column-headers about old and new response sheets
  // so that client-side code can generate migration strategy
  return { message: "lets pretend we did it" }
}