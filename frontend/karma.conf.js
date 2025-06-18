module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-edge-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }]
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['EdgeCustom'],
    singleRun: false,
    restartOnFileChange: true,

    customLaunchers: {
      EdgeCustom: {
        base: 'Edge',
        flags: ['--no-sandbox'],
        // Chemin explicite vers Edge 64-bit
        executablePath: 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
      }
    }
  });
};
