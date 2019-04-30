function migrateCore_(spreadsheet, toGitRef) {
  assertConfigOk_(spreadsheet);    // ensure the current is internally consistent
  
  const sheetConfig = configLoad_(spreadsheet);
  
  const origLinkedRespSheet = getRawRespSheet(spreadsheet, sheetConfig);
  const formUrl = origLinkedRespSheet.getFormUrl();
  if (!formUrl) {
    throw "Error: link the Feedback Form to this spreadsheet before attempting to migrate."
  }
  const form = FormApp.openByUrl(formUrl);
  
  const fromGitRef = sheetConfig.get(configOption_SkillsRepoRelease);
  
  // { migrateFrom: { gitRef, areas, skills }, migrateTo: { gitRef, areas, skills } }
  const migrationPlan = fetchMigrationPlan(fromGitRef, toGitRef);

  // TODOs
  // update additional-context titles
  // update landing page text
  
  //sheetConfig.updateExisting(configOption_LastMigration, "In-flight as of " + new Date());
  //sheetConfig.updateExisting(configOption_SkillsRepoRelease,
  //                           "In-flight from " 
  //                           + migrationPlan.migrateFrom.gitRef 
  //                           + " to " 
  //                           + migrationPlan.migrateTo.gitRef);
 
  
  // stop accepting form responses
  // spin wait for unlinking until changes propogate to sheet
  // unlink form
  // delete all responses
  // edit form, changing rows in checkbox grid <-- this will require some work to port from the prototype
  // relink form
  // find new linked sheet
  // migrate data from old raw-response sheet to new one
  // rebuild skills tab  (share code with setSkillsVersion?)
  //   refill & trim

  // update skills version in config
  // update raw responses sheet name in config
  // re-fill and trim all breakdown page formulas
  // ensure config tab is "Ok"
  // update last-migration field
  
  // re-allow form responses
  
  const successMessage = "Migrated form and sheet from " + fromGitRef + " to " + toGitRef;
  return successMessage;
}

function fetchMigrationPlan(fromGitRef, toGitRef) {
  const baseUrl = "https://us-central1-cf-rd-managers-feedback-eval.cloudfunctions.net/";
  const url = baseUrl + "/migrationPlan?fromGitRef=" + fromGitRef + "&toGitRef=" + toGitRef;
  
  const resp = UrlFetchApp.fetch(url);
  if (resp.getResponseCode() != 200) {
    throw "error fetching migration plan: code " + resp.getResponseCode();
  }
  
  return JSON.parse(resp.getContentText());  
}


function getRawRespSheet(spreadsheet, sheetConfig) {
  return spreadsheet.getSheetByName(sheetConfig.get(configOption_rawResponsesSheetName));
}