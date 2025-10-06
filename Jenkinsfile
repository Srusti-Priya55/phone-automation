pipeline {
  agent any

  parameters {
    // master switch
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')

    // suites (exact keys must match wdio.conf.ts -> suites)
    booleanParam(name: 'install_adb',                defaultValue: false, description: '')
    booleanParam(name: 'install_play',               defaultValue: false, description: '')
    booleanParam(name: 'aggregation_check',          defaultValue: false, description: '')
    booleanParam(name: 'tnd_check',                  defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_all',        defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_trusted',    defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_untrusted',  defaultValue: false, description: '')
    booleanParam(name: 'interface_info',             defaultValue: false, description: '')
    booleanParam(name: 'ipfix_disable',              defaultValue: false, description: '')
    booleanParam(name: 'ipfix_zero',                 defaultValue: false, description: '')
    booleanParam(name: 'parent_process_check',       defaultValue: false, description: '')
    booleanParam(name: 'template_caching_untrusted', defaultValue: false, description: '')
    booleanParam(name: 'before_after_reboot',        defaultValue: false, description: '')
    booleanParam(name: 'aup_should_displayed',       defaultValue: false, description: '')
    booleanParam(name: 'aup_should_not_displayed',   defaultValue: false, description: '')
    booleanParam(name: 'eula_not_accepted',          defaultValue: false, description: '')
    booleanParam(name: 'negatives',                  defaultValue: false, description: '')

    // comma-separated list (e.g. "a@x.com,b@y.com")
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Select suites') {
      steps {
        script {
          def all = [
            'install_adb','install_play','aggregation_check','tnd_check',
            'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
            'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
            'template_caching_untrusted','before_after_reboot',
            'aup_should_displayed','aup_should_not_displayed','eula_not_accepted',
            'negatives'
          ]
          def chosen = params.RUN_ALL ? all : all.findAll { params[it] }
          if (!chosen) error 'No suites selected — pick at least one or enable RUN_ALL'
          env.CHOSEN = chosen.join(',')
          echo "Suites: ${env.CHOSEN}"
        }
      }
    }

    stage('Clean old reports') {
      steps {
        bat '''
        if exist allure-results rmdir /s /q allure-results
        if exist allure-report  rmdir /s /q allure-report
        if exist allure-report.zip del /f /q allure-report.zip
        if exist allure-report.allurezip del /f /q allure-report.allurezip
        '''
      }
    }

    stage('Install deps') {
      steps {
        bat '''
        call node -v
        if errorlevel 1 ( echo Node not found & exit /b 1 )
        call npm ci
        if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Run suites (sequential, with CURRENT_FLOW)') {
      steps {
        script {
          def FLOW = [
            'install_adb':'Install via ADB',
            'install_play':'Install via Play Store',
            'aggregation_check':'Aggregation Check',
            'tnd_check':'TND Check',
            'collection_mode_all':'Collection Mode - All',
            'collection_mode_trusted':'Collection Mode - Trusted',
            'collection_mode_untrusted':'Collection Mode - Untrusted',
            'interface_info':'Interface Info',
            'ipfix_disable':'IPFIX Disable',
            'ipfix_zero':'IPFIX Zero',
            'parent_process_check':'Parent Process Check',
            'template_caching_untrusted':'Template Caching - Untrusted',
            'before_after_reboot':'Before/After Reboot',
            'aup_should_displayed':'AUP Should Display',
            'aup_should_not_displayed':'AUP Should NOT Display',
            'eula_not_accepted':'EULA Not Accepted',
            'negatives':'Negatives'
          ]
          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            withEnv(["CURRENT_FLOW=${flow}"]) {
              // Continue even if a suite fails; pipeline result becomes FAILURE but post{always} still runs
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                bat "npx wdio run wdio.conf.ts --suite ${suite}"
              }
            }
          }
        }
      }
    }

    // Debug stage: shows whether WDIO actually produced Allure JSONs
    stage('Check allure-results') {
      steps {
        bat '''
          echo ===== contents of allure-results =====
          if exist allure-results ( dir /b allure-results ) else ( echo NO allure-results FOLDER )
          echo =====================================
        '''
      }
    }
  }

  post {
    always {
      // 1) Publish Allure link on the build page (requires Allure Jenkins Plugin)
      script {
        if (fileExists('allure-results')) {
          allure(results: [[path: 'allure-results']])
        } else {
          echo 'No allure-results to publish.'
        }
      }

      // 2) Generate static HTML report folder
      bat '''
      if exist allure-report rmdir /s /q allure-report
      if exist allure-report.zip del /f /q allure-report.zip

      if exist allure-results (
        npx allure generate --clean allure-results -o allure-report
      ) else (
        mkdir allure-report
        > allure-report\\index.html echo ^<html^><body^><h3^>No allure results were produced.^</h3^>^</body^>^</html^>
      )
      '''

      // 3) Create a normal ZIP and a Gmail-safe copy (.allurezip)
      powershell '''
        if (Test-Path allure-report.zip) { Remove-Item allure-report.zip -Force }
        Compress-Archive -Path "allure-report/*" -DestinationPath "allure-report.zip"
        Copy-Item "allure-report.zip" "allure-report.allurezip" -Force
      '''

      // 4) Archive everything so it’s always downloadable
      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report.zip, allure-report.allurezip', fingerprint: true

      // 5) Email the Gmail-safe file (works outside your network)
      script {
        if (params.EMAILS?.trim()) {
          emailext(
            from: 'kencholsrusti@gmail.com',  // set to your Gmail SMTP username
            to: params.EMAILS,
            subject: "Mobile Automation • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
            mimeType: 'text/plain',
            body: """Result: ${currentBuild.currentResult}
Build page: ${env.BUILD_URL}

Online (LAN) report: open the **Allure Report** link on the build page.

Offline copy attached:
  1) Download: allure-report.allurezip
  2) Rename to: allure-report.zip
  3) Extract and open: index.html
""",
            attachmentsPattern: 'allure-report.allurezip'
          )
        } else {
          echo 'EMAILS not provided; skipping email.'
        }
      }
    }
  }
}
