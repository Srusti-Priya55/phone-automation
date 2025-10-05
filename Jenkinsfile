// Jenkinsfile (Windows agent, uses your existing UI parameters)
// NOTE: this does NOT declare parameters here, it reads the ones you already made in the UI.
// Make sure the parameter names match (RUN_ALL, INSTALL_ADB, ..., EMAIL_TO).

def ALL_SUITES = [
  'install_adb', 'install_play', 'aggregation_check', 'tnd_check',
  'collection_mode_all', 'collection_mode_trusted', 'collection_mode_untrusted',
  'interface_info', 'ipfix_disable', 'ipfix_zero', 'parent_process_check',
  'template_caching_untrusted', 'before_after_reboot',
  'aup_should_displayed', 'aup_should_not_displayed',
  'eula_not_accepted', 'negatives'
]

def FLOW = [
  install_adb               : 'Install via ADB',
  install_play              : 'Install via Play Store',
  aggregation_check         : 'Aggregation Check',
  tnd_check                 : 'TND Check',
  collection_mode_all       : 'Collection Mode (All)',
  collection_mode_trusted   : 'Collection Mode (Trusted)',
  collection_mode_untrusted : 'Collection Mode (Untrusted)',
  interface_info            : 'Interface Info',
  ipfix_disable             : 'IPFIX Disable',
  ipfix_zero                : 'IPFIX Zero',
  parent_process_check      : 'Parent Process Check',
  template_caching_untrusted: 'Template Caching (Untrusted)',
  before_after_reboot       : 'Before/After Reboot',
  aup_should_displayed      : 'AUP Should Display',
  aup_should_not_displayed  : 'AUP Should NOT Display',
  eula_not_accepted         : 'EULA Not Accepted',
  negatives                 : 'Negatives'
]

pipeline {
  // Your Jenkins is on Windows now; later you can change this label to a Linux agent and swap 'bat' for 'sh'
  agent { label 'windows' }  // or 'built-in' / 'master' if you run on the controller

  options {
    timestamps()
    ansiColor('xterm')
    skipDefaultCheckout(true)
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Resolve selection') {
      steps {
        script {
          // Build the suite list from your UI parameters
          suites = []
          if (params.RUN_ALL) {
            suites = ALL_SUITES
          } else {
            if (params.INSTALL_ADB)                suites << 'install_adb'
            if (params.INSTALL_PLAY)               suites << 'install_play'
            if (params.AGGREGATION_CHECK)          suites << 'aggregation_check'
            if (params.TND_CHECK)                  suites << 'tnd_check'
            if (params.COLLECTION_MODE_ALL)        suites << 'collection_mode_all'
            if (params.COLLECTION_MODE_TRUSTED)    suites << 'collection_mode_trusted'
            if (params.COLLECTION_MODE_UNTRUSTED)  suites << 'collection_mode_untrusted'
            if (params.INTERFACE_INFO)             suites << 'interface_info'
            if (params.IPFIX_DISABLE)              suites << 'ipfix_disable'
            if (params.IPFIX_ZERO)                 suites << 'ipfix_zero'
            if (params.PARENT_PROCESS_CHECK)       suites << 'parent_process_check'
            if (params.TEMPLATE_CACHING_UNTRUSTED) suites << 'template_caching_untrusted'
            if (params.BEFORE_AFTER_REBOOT)        suites << 'before_after_reboot'
            if (params.AUP_SHOULD_DISPLAYED)       suites << 'aup_should_displayed'
            if (params.AUP_SHOULD_NOT_DISPLAYED)   suites << 'aup_should_not_displayed'
            if (params.EULA_NOT_ACCEPTED)          suites << 'eula_not_accepted'
            if (params.NEGATIVES)                  suites << 'negatives'
          }
          if (suites.isEmpty()) {
            error 'No suites selected. Please tick at least one checkbox or RUN_ALL.'
          }
          echo "Suites selected: ${suites}"
        }
      }
    }

    stage('Install deps') {
      steps {
        bat 'npm ci'
      }
    }

    stage('Run WDIO suites') {
      steps {
        script {
          for (s in suites) {
            def flowName = FLOW[s] ?: s
            echo "========== RUNNING: ${s} [FLOW=${flowName}] =========="
            withEnv(["CURRENT_FLOW=${flowName}"]) {
              bat "npx wdio run wdio.conf.ts --suite ${s}"
            }
          }
        }
      }
    }

    stage('Allure & Zip') {
      steps {
        // clean any leftovers (ignore errors)
        bat '''
          rmdir /s /q allure-report  2>nul
          del /q allure-report.zip   2>nul
        '''
        bat 'npx allure generate --clean allure-results'
        // Zip the HTML so we can email it
        bat 'powershell -NoProfile -Command "Compress-Archive -Path ''allure-report\\*'' -DestinationPath ''allure-report.zip'' -Force"'
      }
    }

    stage('Archive & Email') {
      steps {
        archiveArtifacts artifacts: 'allure-results/**,allure-report.zip', fingerprint: true

        script {
          def toList = (params.EMAIL_TO ?: '').trim()
          if (toList) {
            emailext(
              to: toList,
              subject: "Mobile Sanity Suite — ${currentBuild.currentResult} (#${env.BUILD_NUMBER})",
              attachmentsPattern: 'allure-report.zip',
              body: """Hello,

Build: ${env.JOB_NAME} #${env.BUILD_NUMBER}
Status: ${currentBuild.currentResult}
Console: ${env.BUILD_URL}
Suites: ${suites.join(', ')}

Attached: allure-report.zip  (unzip and open index.html)

– Jenkins
"""
            )
          } else {
            echo 'EMAIL_TO is empty — skipping email.'
          }
        }
      }
    }
  }
}
