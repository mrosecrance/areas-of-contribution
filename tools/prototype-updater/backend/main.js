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
  const formResponseSheet = findLinkedSheet_(form);

  return {
    responsesSheet: {
      sheetName: formResponseSheet.getName(),
      columnHeaders: getColumnHeaders_(formResponseSheet),
    },
    form: getForm_(form),
  };
}

// step 4
function migrateFormAndSheet(updateSpec) {
  const form = FormApp.openByUrl(updateSpec.formUrl);
  const edits = updateSpec.edits;
  const migrationPlan = updateSpec.migrationPlan;
  
  const origLinkedRespSheet = findLinkedSheet_(form);
  const sheetConfig = configLoad_(SpreadsheetApp.openById(form.getDestinationId()));
  
  if (sheetConfig.get("Skills repo release") !== migrationPlan.migrateFrom.gitRef) {
    throw "migration start-version mismatch.  Sheet config has current release " + sheetConfig.get("Skills repo release")
       + " but we're attempting to start a migration from " + migrationPlan.migrateFrom.gitRef;
  }
  
  const origLinkedRespSheetName = origLinkedRespSheet.getName();
  const destSpreadsheetId = form.getDestinationId();
  sheetConfig.updateExisting("Last migration", "In-flight as of " + new Date());
  
  // unlink form
  // this way we can make edits to the form without modifying the old response sheet
  form.removeDestination();
  origLinkedRespSheet.setName("Old " + origLinkedRespSheetName); 

  edits.forEach(function(edit) {  
    form.getItemById(edit.id).asCheckboxGridItem().setRows(edit.newRows);
  });
  
  // relink form.  this creates a new responses sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, destSpreadsheetId);
  
  // find new linked sheet
  const newLinkedRespSheet = findLinkedSheet_(form);
  newLinkedRespSheet.setName("Raw");
  
  sheetConfig.updateExisting("Raw Responses Sheet Name", newLinkedRespSheet.getName());
  sheetConfig.updateExisting("Last migration", new Date());
  sheetConfig.updateExisting("Skills repo release", migrationPlan.migrateTo.gitRef);
  
  const rawRespMigrations = buildRawResponseMigrations_(
    migrationPlan.migrateFrom.skills,
    migrationPlan.migrateTo.skills,
    getColumnHeaders_(origLinkedRespSheet),
    getColumnHeaders_(newLinkedRespSheet));
  
  const numRows = origLinkedRespSheet.getLastRow()-1;
  if (numRows < 1) {
    return { message: "no data in original raw responses sheet." };
  }
  
  rawRespMigrations.forEach(function(mig) {
    const srcRange = origLinkedRespSheet.getRange(2, mig.srcColIndex, numRows);
    const dstColumn = newLinkedRespSheet.getRange(2, mig.dstColIndex);
    srcRange.copyTo(dstColumn, {contentsOnly:true});
  });

  return { message: "migrated " + rawRespMigrations.length + " columns." }
}