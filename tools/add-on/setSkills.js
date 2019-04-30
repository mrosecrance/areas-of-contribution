function fetchAreasAndSkillsFromCSV_(gitRef) {
  const response = UrlFetchApp.fetch("https://us-central1-cf-rd-managers-feedback-eval.cloudfunctions.net/skillsAsCSV?gitRef=" + gitRef);
  return Utilities.parseCsv(response.getContentText());
}

function setAndTrimSkills_(skills, skillsSheet) {
  skillsSheet.getRange("A2:C").clear();
  if (skillsSheet.getMaxRows() < skills.length+1) {
   skillsSheet.insertRowsAfter(skillsSheet.getMaxRows(), skills.length+1-skillsSheet.getMaxRows());
  }
  skillsSheet.getRange(2, 1, skills.length,3).setValues(skills);
  if (skillsSheet.getMaxRows() > skills.length+1) {
    skillsSheet.deleteRows(skills.length+2,skillsSheet.getMaxRows()-skills.length-1);
  }
}

function setSkillsCore_(spreadsheet, gitRef) {
  const skillsSheet = spreadsheet.getSheetByName("Skills");
  
  configLoad_(spreadsheet).updateExisting(configOption_SkillsRepoRelease, gitRef);

  const skills = fetchAreasAndSkillsFromCSV_(gitRef);
  setAndTrimSkills_(skills, skillsSheet);
  
  // TODO: refill formulas and trim ranges on breakdown pages
}