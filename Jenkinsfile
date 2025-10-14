// ──────────────────────────────────────────────────────────────
// Dynamic Scheduling + Full Mobile Automation Jenkinsfile
// Requires: Active Choices Plugin, Active Choices Reactive Parameter
// Safe for Production or Local Jenkins Server
// ──────────────────────────────────────────────────────────────

pipeline {
    agent any

    // ──────────────────────────────────────────────────────────
    // Parameters (Scheduling + Existing Flow)
    // ──────────────────────────────────────────────────────────
    parameters {
        // ===== Dynamic Scheduling (Web-UI-like) =====
        choice(
            name: 'SCHEDULE_OPTION',
            choices: ['Run Now', 'Schedule Once', 'Recurring Schedule'],
            description: 'Select when to run this automation'
        )

        activeChoiceReactiveParam('SCHEDULE_FIELDS') {
            description('Dynamic scheduling options based on selection')
            groovyScript {
                script("""
                    if (SCHEDULE_OPTION == "Run Now") {
                        return ["No scheduling — run immediately"]
                    } else if (SCHEDULE_OPTION == "Schedule Once") {
                        return ["Enter Date (YYYY-MM-DD)", "Enter Time (HH:mm)"]
                    } else if (SCHEDULE_OPTION == "Recurring Schedule") {
                        return ["Frequency (Daily/Weekly)", "Day (if Weekly)", "Time (HH:mm)"]
                    } else {
                        return ["Invalid selection"]
                    }
                """)
                fallbackScript("return ['Unable to load options']")
            }
        }

        string(name: 'SCHEDULE_DATE', defaultValue: '', description: 'Date if "Schedule Once" selected (YYYY-MM-DD)')
        string(name: 'SCHEDULE_TIME', defaultValue: '09:00', description: 'Time (HH:mm)')
        choice(name: 'RECUR_FREQUENCY', choices: ['Daily', 'Weekly'], description: 'Frequency for recurring')
        choice(name: 'RECUR_DAY', choices: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
               description: 'Day for weekly recurrence')

        // ===== Existing flow parameters =====
        booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all flows')
        booleanParam(name: 'install_adb', defaultValue: false, description: '')
        booleanParam(name: 'install_play', defaultValue: false, description: '')
        booleanParam(name: 'aggregation_check', defaultValue: false, description: '')
        booleanParam(name: 'tnd_check', defaultValue: false, description: '')
        booleanParam(name: 'collection_mode_all', defaultValue: false, description: '')
        booleanParam(name: 'collection_mode_trusted', defaultValue: false, description: '')
        booleanParam(name: 'collection_mode_untrusted', defaultValue: false, description: '')
        booleanParam(name: 'interface_info', defaultValue: false, description: '')
        booleanParam(name: 'ipfix_disable', defaultValue: false, description: '')
        booleanParam(name: 'ipfix_zero', defaultValue: false, description: '')
        booleanParam(name: 'parent_process_check', defaultValue: false, description: '')
        booleanParam(name: 'template_caching_untrusted', defaultValue: false, description: '')
        booleanParam(name: 'before_after_reboot', defaultValue: false, description: '')
        booleanParam(name: 'aup_should_displayed', defaultValue: false, description: '')
        booleanParam(name: 'aup_should_not_displayed', defaultValue: false, description: '')
        booleanParam(name: 'eula_not_accepted', defaultValue: false, description: '')
        booleanParam(name: 'negatives', defaultValue: false, description: '')
        string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
    }

    // ──────────────────────────────────────────────────────────
    environment {
        NODE_HOME = "C:\\Program Files\\nodejs"
        PATH = "${env.NODE_HOME};${env.PATH}"
    }

    options { timestamps() }

    // ──────────────────────────────────────────────────────────
    stages {
        // Scheduling Logic
        stage('Handle Schedule Option') {
            steps {
                script {
                    def opt = params.SCHEDULE_OPTION
                    echo "🕒 Schedule option selected: ${opt}"

                    if (opt == 'Run Now') {
                        echo "▶️ Running immediately..."
                    } else if (opt == 'Schedule Once') {
                        if (!params.SCHEDULE_DATE?.trim()) {
                            error "❌ Missing SCHEDULE_DATE — please fill it before running."
                        }
                        echo "📅 One-time schedule for ${params.SCHEDULE_DATE} at ${params.SCHEDULE_TIME}"
                    } else if (opt == 'Recurring Schedule') {
                        echo "🔁 Recurring schedule selected"
                        echo "Frequency: ${params.RECUR_FREQUENCY}"
                        if (params.RECUR_FREQUENCY == 'Weekly') {
                            echo "Day: ${params.RECUR_DAY}"
                        }
                        echo "Time: ${params.SCHEDULE_TIME}"
                    }
                }
            }
        }

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

        stage('Clean outputs') {
            steps {
                bat '''
                if exist allure-results rmdir /s /q allure-results
                if exist allure-report rmdir /s /q allure-report
                if exist allure-report.single.html del /f /q allure-report.single.html
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

        stage('Select flows') {
            steps {
                script {
                    def all = [
                        'install_adb','install_play','aggregation_check','tnd_check',
                        'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
                        'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
                        'template_caching_untrusted','before_after_reboot',
                        'aup_should_displayed','aup_should_not_displayed','eula_not_accepted','negatives'
                    ]
                    def chosen = params.RUN_ALL ? all : all.findAll { params[it] }
                    if (!chosen) error 'No flows selected — pick at least one or enable RUN_ALL'
                    env.CHOSEN = chosen.join(',')
                    echo "Flows selected: ${env.CHOSEN}"
                }
            }
        }

        stage('Run flows (sequential)') {
            steps {
                script {
                    def FLOW = [
                        install_adb : 'Install via ADB',
                        install_play : 'Install via Play Store',
                        aggregation_check : 'Aggregation Check',
                        tnd_check : 'TND Check',
                        collection_mode_all : 'Collection Mode - All',
                        collection_mode_trusted : 'Collection Mode - Trusted',
                        collection_mode_untrusted : 'Collection Mode - Untrusted',
                        interface_info : 'Interface Info',
                        ipfix_disable : 'IPFIX Disable',
                        ipfix_zero : 'IPFIX Zero',
                        parent_process_check : 'Parent Process Check',
                        template_caching_untrusted: 'Template Caching - Untrusted',
                        before_after_reboot : 'Before/After Reboot',
                        aup_should_displayed : 'AUP Should Display',
                        aup_should_not_displayed : 'AUP Should NOT Display',
                        eula_not_accepted : 'EULA Not Accepted',
                        negatives : 'Negatives'
                    ]

                    def results = []
                    for (suite in env.CHOSEN.split(',')) {
                        def flow = FLOW.get(suite, suite)
                        echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
                        int code = 1
                        withEnv(["CURRENT_FLOW=${flow}"]) {
                            catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                                code = bat(returnStatus: true, script: "npx wdio run wdio.conf.ts --suite ${suite}")
                                if (code != 0) { error "Suite ${suite} failed" }
                            }
                        }
                        def status = (code == 0) ? 'SUCCESS' : 'FAILURE'
                        results << [name: flow, status: status]
                    }
                    writeFile file: 'suite_results.txt', text: results.collect { r -> "${r.name}|${r.status}" }.join('\n')
                }
            }
        }

        stage('Generate Allure') {
            steps {
                bat '''
                echo ==== Generate Allure ====
                if not exist allure-results ( echo No allure-results found & exit /b 1 )
                npx allure generate --clean allure-results -o allure-report
                '''
            }
        }

        stage('Publish Allure (Jenkins link)') {
            steps {
                script {
                    if (fileExists('allure-results')) {
                        allure(results: [[path: 'allure-results']])
                        echo 'Published Allure results to Jenkins.'
                    } else {
                        echo 'No allure-results to publish.'
                    }
                }
            }
        }

        stage('Make single-file HTML (no server)') {
            steps {
                bat '''
                echo ==== Build single HTML ====
                if not exist tools\\pack-allure-onehtml.js ( echo Missing tools\\pack-allure-onehtml.js & exit /b 1 )
                if not exist allure-report\\index.html ( echo Missing allure-report\\index.html & exit /b 1 )
                node tools\\pack-allure-onehtml.js allure-report
                if not exist allure-report\\allure-report.offline.html ( echo Single HTML not created & dir allure-report & exit /b 1 )
                copy /y "allure-report\\allure-report.offline.html" "allure-report.single.html" >nul
                echo Created: allure-report.single.html
                '''
            }
        }

        stage('Publish & Archive') {
            steps {
                script {
                    archiveArtifacts artifacts: 'allure-results/**, allure-report/**, tools/**, allure-report.single.html, suite_results.txt', fingerprint: true

                    def recipients = (params.EMAILS ?: '').trim()
                    if (recipients) {
                        def perSuiteHtml = ''
                        if (fileExists('suite_results.txt')) {
                            def lines = readFile('suite_results.txt').trim().split(/\r?\n/)
                            def rows = lines.collect { line ->
                                def parts = line.split('\\|', 2)
                                def name = parts[0]
                                def status = parts.size() > 1 ? parts[1] : ''
                                def color = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'
                                """<tr><td>${name}</td><td style='color:${color}'>${status}</td></tr>"""
                            }.join('\n')
                            perSuiteHtml = "<table border='1' cellspacing='0' cellpadding='5'><tr><th>Test</th><th>Status</th></tr>${rows}</table>"
                        }

                        def status = currentBuild.currentResult
                        def color = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'
                        emailext(
                            to: recipients,
                            subject: "Mobile Sanity Build #${env.BUILD_NUMBER} ${status}",
                            mimeType: 'text/html',
                            body: """
                                <p>Hi Team,</p>
                                <p>Status: <b><span style='color:${color}'>${status}</span></b></p>
                                <p>Executed On: ${new Date().format("yyyy-MM-dd HH:mm:ss")}</p>
                                <p>Duration: ${currentBuild.durationString.replace(' and counting','')}</p>
                                ${perSuiteHtml}
                                <p>Attached: allure-report.single.html</p>
                            """,
                            attachmentsPattern: 'allure-report.single.html'
                        )
                    } else {
                        echo 'EMAILS empty — skipping email.'
                    }
                }
            }
        }
    }
}
