function onOpen() {
  SpreadsheetApp.getUi().createMenu("Areas of Contribution")
    .addItem("Set skill version...", "setSkillVersionUI_")
    .addItem("Migrate...", "migrateUI_")
    .addToUi();
}

function onInstall(e) {
  onOpen();
}

function promptTextOkCancel_(ui, title, message) {
  const result = ui.prompt(
      title,
      message,
      ui.ButtonSet.OK_CANCEL);

  const button = result.getSelectedButton();
  const response = result.getResponseText();
  if (button !== ui.Button.OK) {
    return; // clicked cancel or close
  }
  return response;
}


function migrateUI_() {
  const ui = SpreadsheetApp.getUi();
  const toGitRef = promptTextOkCancel_(ui, "Migrate", 
      "Migrate the sheet, linked form, and all response data\nfrom your current version of Areas of Contribution to a new version.\n\nMigrate to git ref:");
  if (!toGitRef) {
    return;
  }
  
  const successMessage = migrateCore_(SpreadsheetApp.getActiveSpreadsheet(), toGitRef);
  
  ui.alert(successMessage);
}

function setSkillVersionUI_() {
  const ui = SpreadsheetApp.getUi();
  const gitRef = promptTextOkCancel_(ui, 'Set Skill Version',
    "This won't migrate data, it just picks the version of skills\nto use with the raw response data.\n\nEnter git ref:");
  if (!gitRef) {
    return;
  }

  setSkillsCore_(SpreadsheetApp.getActiveSpreadsheet(), gitRef)
  ui.alert("Skill definitions updated to " + gitRef);
}
