

// step 2: get the sheet spec
function getResponsesSheet_(form, spreadsheet) {
  const sheets = spreadsheet.getSheets();
  var linkedSheets = [];
  sheets.forEach(function(s) { 
    const u = s.getFormUrl();
    if (!u) {
      return;
    }
    if (u.indexOf(form.getId()) < 1) {
      return;
    }
    linkedSheets.push(s);
  });
  
  if (linkedSheets.length > 1) {
    throw "too many sheets are linked to this form";
  }
  if (linkedSheets.length < 1) {
    throw "expecting to find a sheet linked to " + formEditUrl + " but instead found " + sheets.map(function(s) { return s.getFormUrl(); }).toString();
  }
  const formResponseSheet = linkedSheets[0];
   
  const columnHeaders = trimFinalBlanks_(formResponseSheet.getRange("A1:1").getValues()[0]);
  return {
    sheetName: formResponseSheet.getName(),
    columnHeaders: columnHeaders,
  };
}

function trimFinalBlanks_(input) {
 var ar = input.slice();
 while (ar.length) {
   if (ar[ar.length-1] !== "") { 
     break;
   }
   ar.pop();
 }
 return ar;
}


function updateSheet(updateInfo) {
  var formUrl = updateInfo.formUrl;
  var changes = updateInfo.changes;

  var spreadsheet = SpreadsheetApp.openById(FormApp.openByUrl(formUrl).getDestinationId());
  
  changes.forEach(function(change) {
    var sheet = spreadsheet.getSheetByName(change.sheetName);
    var cell = sheet.getRange(change.column + change.row);
    var actualValue = cell.getValue().toString();
    if (actualValue !== change.currentValue) {
      throw "actual value of cell doesn't match what was expected"; 
    }
    //cell.setValue(change.newValue)
  });
  return changes;
}

function isBreakdownPage_(sheet) {
  var name = sheet.getName();
  var headers = getA1B1(sheet);
  return (headers[0] === name) && (headers[1] === "Skill Level");
}

function isRawResponsePage_(sheet) {
  var headers = getA1B1(sheet);
  return (headers[0] === "Timestamp") && (headers[1] === "Email Address");
}

function getA1B1_(sheet) {
  return sheet.getRange("A1:B1").getValues()[0];
}

function isNonEmptyRow_(row) {
  return row.every(function(cell) { return (cell !== "") });
}

function skillFromRow_(row) {
  return { description: row[0], level: row[1] }
}
