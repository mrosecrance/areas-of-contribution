function findLinkedSheet_(form) {
  const spreadsheet = SpreadsheetApp.openById(form.getDestinationId());
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
    throw "expecting to find one sheet linked to " + formEditUrl + " but instead found " + sheets.map(function(s) { return s.getFormUrl(); }).toString();
  }
  return linkedSheets[0];
}

function getColumnHeaders_(sheet) {
  return trimFinalBlanks_(sheet.getRange("A1:1").getValues()[0]);
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


function configLoad_(spreadsheet) {
  const configSheet = spreadsheet.getSheetByName("Config");
  if (!configSheet) {
    throw "missing expected tab 'Config'.   Please upgrade to Feedback Response spreadsheet v2 before using this tool"
  }
  const range = configSheet.getRange("A2:B");
  return {
    range: range,
    rawValues: range.getValues(),
    get: function(key) {
      var i;
      for(i = 0; i<this.rawValues.length; i++) {
        if (this.rawValues[i][0] == key) {
          return this.rawValues[i][1];
        }
      }
      throw "config key not found " + key;
    },
    updateExisting: function(key, value) {
      var i;
      for(i = 0; i<this.rawValues.length; i++) {
        if (this.rawValues[i][0] == key) {
          this.rawValues[i][1] = value;
          break;
        }
      }
      if (i == this.rawValues.length) {
        throw "config key not found " + key; 
      }
      this.range.setValues(this.rawValues);
    }
  };
}



function buildRawResponseMigrations_(startSkills, endSkills, startRawResponseColHeaders, endRawResponseColHeaders) {
  const startColIndex = makeIndex_(startRawResponseColHeaders);
  const endColIndex = makeIndex_(endRawResponseColHeaders);
  
  const endSkillsDict = arrayToDict_(endSkills, function(s) { return [s.id, s] });
  const toMigrate = startSkills.filter(function(startSkill) { return (startSkill.id in endSkillsDict); });
  
  return toMigrate.map(function(startSkill) {
    const endSkill = endSkillsDict[startSkill.id];
    return {
      srcColIndex: startColIndex[formatSkillForSheet_(startSkill.description)],
      dstColIndex: endColIndex[formatSkillForSheet_(endSkill.description)],
    };
  });
}

function formatSkillForSheet_(skillDescription) {
  return " [" + skillDescription + "]";
}

function makeIndex_(ar) {
  return arrayToDict_(ar, function(el, i) { return [el, i] });
}

function arrayToDict_(arrayElements, getKeyAndValue) {
  var dict = {}
  arrayElements.map(getKeyAndValue).forEach(function(kv) {
    const [key,val] = kv;
    dict[key] = val;
  })
  return dict;
}
