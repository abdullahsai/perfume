function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Perfume App')
    .addItem('Open App', 'showPerfumeApp')
    .addSeparator()
    .addItem('Flush Logs', 'PerfumeLogging.flush')
    .addToUi();
}

function showPerfumeApp() {
  var html = doGet({});
  SpreadsheetApp.getUi().showSidebar(html);
}
