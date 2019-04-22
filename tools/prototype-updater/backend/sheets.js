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

var configOption_SkillsRepoRelease = "Skills repo release";
var configOption_LastMigration = "Last migration";
var configOption_rawResponsesSheetName = "Raw Responses Sheet Name";

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

function migrateRawResponses_(migrationPlan, origLinkedRespSheet, newLinkedRespSheet) {
  const plan = planRawResponseMigrations_(
    migrationPlan,
    getColumnHeaders_(origLinkedRespSheet),
    getColumnHeaders_(newLinkedRespSheet));
  
  const numRows = origLinkedRespSheet.getLastRow()-1;
  if (numRows < 1) {
    return { message: "no data in original raw responses sheet." };
  }
  
  plan.forEach(function(mig) {
    if (typeof mig.srcColIndex !== "number") {
      throw "expected srcColIndex to be number, instead was " + mig.srcColIndex;
    }
    const srcRange = origLinkedRespSheet.getRange(2, mig.srcColIndex, numRows);
    const dstColumn = newLinkedRespSheet.getRange(2, mig.dstColIndex);
    srcRange.copyTo(dstColumn);
  });
  
  return plan;
}


// returns mapping from old column to new column
function planRawResponseMigrations_(migrationPlan, startRawResponseColHeaders, endRawResponseColHeaders) {
  const startColIndex = makeColumnHeaderIndex_(startRawResponseColHeaders);
  const endColIndex = makeColumnHeaderIndex_(endRawResponseColHeaders);
  
  function toColumnIndicies_(hdrMigrations) {
    return hdrMigrations.map(function(m) {
      const ret = { 
        srcColIndex: startColIndex[m.srcColHeader],
        dstColIndex: endColIndex[m.dstColHeader]
      };
      if ((ret.srcColIndex > 0) && (ret.dstColIndex > 0)) {
        return ret;
      }
      throw "unabled to find indicies for column headers: " + JSON.stringify(m);
    });
  }
  
  const metadataColumnsToMigrate = [1,2,3,4].map(function(i) { return { srcColIndex: i, dstColIndex: i }; });
  const skillColumnsToMigrate = toColumnIndicies_(planMigrationSkills_(migrationPlan));
  const additionalContextColumnsToMigrate = toColumnIndicies_(planMigrationAdditionalContext_(migrationPlan));

  return metadataColumnsToMigrate.concat(additionalContextColumnsToMigrate).concat(skillColumnsToMigrate);
}

function planMigrationAdditionalContext_(migrationPlan) {
  return planMigrationColHeaders_(
    migrationPlan.migrateFrom.areas,
    migrationPlan.migrateTo.areas,
    function(area) { return formatAdditionalContextTitle_(areaTitleForForm_(area)); }  // form title, not sheet title
  ).concat(planMigrationColHeaders_(
    migrationPlan.migrateFrom.areas,
    migrationPlan.migrateTo.areas,
    function(area) { return formatAdditionalContextTitle_("Advanced " + areaTitleForForm_(area)); }  // form title, not sheet title
  ));
}

function planMigrationSkills_(migrationPlan) {
  return planMigrationColHeaders_(
    migrationPlan.migrateFrom.skills,
    migrationPlan.migrateTo.skills,
    function(skill) { return formatSkillForSheet_(skill.description); }
  );
}

function planMigrationColHeaders_(startItems, endItems, getColHeader) {
  const endDict = arrayToDict_(endItems, function(i) { return [i.id, i] });
  const toMigrate = startItems.filter(function(i) { return (i.id in endDict); });
  return toMigrate.map(function(startItem) {
    return {
      srcColHeader: getColHeader(startItem),
      dstColHeader: getColHeader(endDict[startItem.id])
    };
  });  
}

function buildNewSkillsTable_(migrateTo) {
  const areasDict = arrayToDict_(migrateTo.areas, function(area) { return [area.id, area] });
  
  return migrateTo.skills.map(function(skill) {
    const area = areaTitleForSheet_(areasDict[skill.area]);
    const desc = formatSkillForSheet_(skill.description);
    const level = skill.level.toUpperCase();
    return [area, desc, level];
  });
}
            
            
function areaTitleForSheet_(a) {
  return a.sheet ? a.sheet.title : a.title;
}

function areaTitleForForm_(a) {
  return a.form ? a.form.title : a.title;
}

function formatSkillForSheet_(skillDescription) {
  return " [" + skillDescription + "]";
}

function makeColumnHeaderIndex_(headerStrings) {
  return arrayToDict_(headerStrings, function(s, i) { return [s, i+1] });
}

function arrayToDict_(arrayElements, getKeyAndValue) {
  var dict = {}
  arrayElements.map(getKeyAndValue).forEach(function(kv) {
    dict[kv[0]] = kv[1];
  })
  return dict;
}
