var PerfumeConfig = {
  sheetNames: {
    materials: 'Materials',
    purchases: 'Purchases',
    formulas: 'Formulas',
    bottles: 'Bottles',
    logs: 'Logs'
  },
  logRetentionRows: 3000,
  defaultMargin: 0.25
};

function getSpreadsheet() {
  var active = SpreadsheetApp.getActive();
  if (!active) {
    throw new Error('No active spreadsheet available. Deploy the script bound to a spreadsheet.');
  }
  return active;
}
