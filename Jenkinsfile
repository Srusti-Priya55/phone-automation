pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')

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

    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH      = "${env.NODE_HOME};${env.PATH}"
    SINGLE_FILE_NAME = "allure-report.single.html"
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Agent sanity') {
      steps {
        bat '''
          echo ===== Agent sanity =====
          where node
          node -v
          where npm
          npm -v
        '''
      }
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
          echo "Suites selected: ${env.CHOSEN}"
        }
      }
    }

    stage('Clean outputs') {
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist "%SINGLE_FILE_NAME%" del /f /q "%SINGLE_FILE_NAME%"
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

    stage('Run suites') {
      steps {
        script {
          def FLOW = [
            install_adb:'Install via ADB', install_play:'Install via Play Store',
            aggregation_check:'Aggregation Check', tnd_check:'TND Check',
            collection_mode_all:'Collection Mode - All',
            collection_mode_trusted:'Collection Mode - Trusted',
            collection_mode_untrusted:'Collection Mode - Untrusted',
            interface_info:'Interface Info', ipfix_disable:'IPFIX Disable',
            ipfix_zero:'IPFIX Zero', parent_process_check:'Parent Process Check',
            template_caching_untrusted:'Template Caching - Untrusted',
            before_after_reboot:'Before/After Reboot',
            aup_should_displayed:'AUP Should Display',
            aup_should_not_displayed:'AUP Should NOT Display',
            eula_not_accepted:'EULA Not Accepted',
            negatives:'Negatives'
          ]
          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            withEnv(["CURRENT_FLOW=${flow}"]) {
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                bat "npx wdio run wdio.conf.ts --suite ${suite}"
              }
            }
          }
        }
      }
    }

    stage('Generate Allure') {
      steps {
        bat '''
          echo ==== Generate Allure ====
          npx allure generate --clean allure-results -o allure-report
        '''
      }
    }

    // *********** FIXED SINGLE-HTML STAGE ***********
    stage('Make single-file HTML (no server)') {
  steps {
    powershell '''
      $ErrorActionPreference = "Stop"

      # 1) Locate Edge (prefer 64-bit path, fallback to x86)
      $edge = "${Env:ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe"
      if (-not (Test-Path $edge)) {
        $edge = "${Env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe"
      }
      if (-not (Test-Path $edge)) {
        throw "Microsoft Edge not found. Install Edge or set --browser-executable-path manually."
      }
      Write-Host "Using Edge at: $edge"

      # 2) Build file:// URL for Allure index.html
      $indexFile = Join-Path $PWD "allure-report\\index.html"
      if (-not (Test-Path $indexFile)) { throw "Allure index.html not found: $indexFile" }
      $indexUrl = "file:///" + ($indexFile -replace '\\\\','/')  # file:///C:/...

      # 3) Output path
      $out = "allure-report.single.html"
      if (Test-Path $out) { Remove-Item $out -Force }

      # 4) Run single-file-cli via npx, forcing a known version and pointing to Edge
      $cmd = @(
        "npx", "--yes", "--package", "single-file-cli@2.0.75", "single-file",
        $indexUrl,
        "-o", $out,
        "--browser-executable-path", "`"$edge`"",
        "--browser-headless", "true",
        "--browser-arg", "--headless=new",
        "--browser-arg", "--disable-gpu",
        "--browser-arg", "--allow-file-access-from-files",
        "--browser-wait-until", "networkIdle",
        "--browser-wait-until-delay", "1500",
        "--block-scripts", "false",
        "--self-extracting-archive", "true",
        "--resolve-links", "false"
      )
      Write-Host "Running: $($cmd -join ' ')"
      & cmd.exe /c ($cmd -join ' ') | Out-Host

      # 5) Verify output
      if (-not (Test-Path $out)) {
        throw "Single HTML not created: $out"
      } else {
        $size = (Get-Item $out).Length
        Write-Host "✅ Created $out ($size bytes)"
      }
    '''
  }
}

    stage('Publish & Archive') {
      steps {
        script {
          try {
            if (fileExists('allure-results')) {
              allure(results: [[path: 'allure-results']])
            }
          } catch (err) {
            echo "Allure publish step failed (non-fatal): ${err}"
          }
        }
        archiveArtifacts artifacts: "allure-results/**, allure-report/**, ${env.SINGLE_FILE_NAME}", fingerprint: true
      }
    }
  }

  post {
    always {
      script {
        if (params.EMAILS?.trim()) {
          catchError(buildResult: currentBuild.currentResult, stageResult: 'FAILURE') {
            def bodyText = """Result: ${currentBuild.currentResult}

Attached:
- ${env.SINGLE_FILE_NAME} (opens on phone/desktop without a server)
"""
            emailext(
              to: params.EMAILS,
              subject: "Mobile Sanity Suite • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
              mimeType: 'text/plain',
              body: bodyText,
              attachmentsPattern: "${env.SINGLE_FILE_NAME}"
            )
          }
        } else {
          echo 'EMAILS not provided — skipping email.'
        }
      }
    }
  }
}
