// ==UserScript==
// @name     Farm Helper
// @namespace   https://*.tribalwars.com.br
// @namespace   https://*.tribalwars.net
// @include     **screen=am_farm*
// @include     *.tribalwars*screen=am_farm*
// @version     5.2
// @grant       GM_xmlhttpRequest
// ==/UserScript==

$(document).ready(function() {

    let scriptInitials = 'FH';
    let scriptFriendlyName = 'Assistente de Fazenda';
    let scriptTimerColor = '#B5D278';

    let config = {};

    readScreenParams();
    readSessionConfig();
    readSessionState();
    readReports();
    createControls();

    // iniciar coleta se estiver habilitado
    if (isEnabled()) {
        startLoot();
    }

    function scriptVillageName() {
        return scriptInitials + '.' + config.q.village;
    }

    function readSessionConfig() {
        console.log('Lendo configuração da sessão...');

        config.session = {};

        let i = 0;
        let prefix = scriptVillageName() + '.';

        while(true) {
            let key = sessionStorage.key(i++);

            if (!key) {
                break;
            }

            // processar apenas configuração do script/vilarejo atual
            if (key.startsWith(prefix)) {
                let item = key.substr(prefix.length);
                console.log(key + '->' + item);
                config.session[item] = sessionStorage.getItem(key);
            }
        }

        if (!config.session.state) {
            disableSession();
        }

        console.log('Configuração da sessão lida', config.session);
    }

    function saveSessionConfig() {
        console.log('Salvando configuração da sessão...', config.session);
        let prefix = scriptVillageName() + '.';

        for (let item in config.session) {
            let value = sessionStorage.getItem(prefix + item);
            if (!value || value != config.session[item]) {
                console.log('Salvando:', prefix + item, config.session[item]);
                sessionStorage.setItem(prefix + item, config.session[item]);
            } else {
                console.log('Sem alterações:', prefix + item, config.session[item]);
            }
        }

        console.log('Configuração da sessão salva');
    }

    function isEnabled() {
        return config.session.state === 'enabled';
    }

    function readSessionState() {
        config.session.state = sessionStorage.getItem('state');
    }

    function saveSessionState() {
        sessionStorage.setItem('state', config.session.state);
    }

    function enableSession() {
        config.session.state = 'enabled';
        saveSessionState();
    }

    function disableSession() {
        config.session.state = 'disabled';
        saveSessionState()
    }

    function saveIndex() {
        config.session.index = '' + config.currentIndex;
        saveSessionConfig()
    }

    function readIndex() {
        config.currentIndex = config.session.index ? parseInt(config.session.index) : 0;
    }

    function resetIndex() {
        config.currentIndex = 0;
        saveIndex();
    }

    function createControls() {
        console.log('Criando controles...');

        let inputs = {};

        let elements = document.querySelectorAll('div.vis');
        //console.log(elements);

        // criar div
        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        elements[1].parentNode.insertBefore(controlsDiv, elements[1].nextSibling);

        let h = document.createElement('h4');
        h.innerHTML = 'Assistente de Fazenda';
        controlsDiv.appendChild(h);

        let innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        innerDiv.appendChild(table);

        let body = document.createElement('tbody');
        table.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

        let tr1 = document.createElement('tr');
        body.appendChild(tr1);

        // colunas
        let columns = [
            ['', 'Status'],
            ['template', 'Modelo', '<option value="a">A</option><option value="b">B</option>', 'a'],
            ['distance', 'Distância', '<option value="6">6</option><option value="12">12</option><option value="18">18</option><option value="36">36</option><option value="100">100</option>', '36']
        ];

        for (let i = 0; i < columns.length; ++i) {
            let th = document.createElement('th');
            th.style = 'text-align:center';
            th.innerHTML = columns[i][1];
            tr0.appendChild(th);

            let td = document.createElement('td');
            td.align = 'center';
            if (i == 0) {
                td.innerHTML = 'Inativo.';
                td.style = 'width:30%';
                inputs[columns[i][0]] = td;
            } else {
                let input = document.createElement('select');
                input.innerHTML = columns[i][2];
                input.name = columns[i][0];
                td.appendChild(input);
                inputs[columns[i][0]] = input;

                if (config.session[columns[i][0]]) {
                    console.log('Da sessão', columns[i][0], config.session[columns[i][0]]);
                    input.value = config.session[columns[i][0]];
                } else {
                    console.log('Padrões', columns[i][0]);
                    input.value = columns[i][3];
                }
            }
            tr1.appendChild(td);
        }

        // adicionar botões

        // salvar
        let tdb = document.createElement('td');
        tdb.width = '5%';
        tdb.align = 'center';

        let btn = document.createElement('input');
        btn.className = 'btn';
        btn.value = 'Salvar';
        btn.addEventListener('click', saveSelection, false);
        tdb.appendChild(btn);

        tr0.appendChild(tdb);
        inputs.save = btn;

        // iniciar
        tdb = document.createElement('td');
        tdb.width = '5%';
        tdb.align = 'center';

        btn = document.createElement('input');
        btn.className = 'btn';
        if (!isEnabled()) {
            btn.value = 'Iniciar';
            btn.addEventListener('click', activate, false);
        } else {
            btn.value = 'Parar';
            btn.addEventListener('click', deactivate, false);
        }
        tdb.appendChild(btn);

        tr1.appendChild(tdb);
        inputs.start = btn;

        console.log('Controles criados.', inputs);

        config.inputs = inputs;

        // criar controle de temporizadores
        // criar div
        let timersDiv = document.createElement('div');
        timersDiv.className = 'vis';
        controlsDiv.after(timersDiv);

        h = document.createElement('h4');
        h.innerHTML = 'Fila de Execução';
        timersDiv.appendChild(h);

        innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        timersDiv.appendChild(createTimersTable());
    }

    function saveSelection() {
        for (let control in config.inputs) {
            let name = config.inputs[control].name;
            let value = config.inputs[control].value;

            if (name) {
                config.session[name] = value;
            }
        }
        saveSessionConfig();

        // adicionar vilarejo à lista de temporizadores sem atraso
        addTimer('Pronto para Iniciar', pageUrl(), 0, true);
    }

    function disablecontrols() {
        // remover divs
        let elements = document.querySelectorAll('div.vis');
        elements[0].remove();
        elements[1].remove();

        // desativar controles
        for (let control in config.inputs) {
            if (control != 'start') {
                config.inputs[control].readOnly = true;
                config.inputs[control].disabled = true;
            }
        }
    }

    function startLoot() {

        disablecontrols();

        setStatus('Iniciando...');

        readIndex();

        config.currentTemplate = config[config.session.template];
        config.wait = 25;
        config.distance = parseInt(config.session.distance);

        startReportProcess(false);
    }

    function activate() {
        saveSelection();
        disablecontrols();

        setStatus('Iniciando...');
        enableSession();
        loadFirstTimer();
    }

    function deactivate() {
        disableSession();
        window.location.reload();
    }

    function startReportProcess(wait) {

        let min = wait ? (config.wait - 3) * 60000 : 600;
        let max = wait ? (config.wait + 3) * 60000 : 800;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);
        console.log('Aguardando ' + rand + ' milissegundos...');
        window.setTimeout(function() {
            processReport();
        }, rand);

        var date = new Date(Date.now() + rand);
        return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    function pageUrl(page) {
        let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&': '') + 'village=' + config.q.village + '&screen=am_farm&order=distance&dir=asc';
        if (page) {
            url += '&Farm_page=' + page;
        }
        return url;
    }

    function waitAndReload(reason, page) {

        setStatus(reason);

        // não esperar muito tempo para a página 3 - 5 segundos
        let min = page ? 3000 : (config.wait - 3) * 60000;
        let max = page ? 5000 : (config.wait + 3) * 60000;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);

        console.log('Aguardar e recarregar', reason, page);
        if (page == undefined) {
            page = getPage();
        }
        let url = pageUrl(page);

        // adicionar à lista de temporizadores
        // carregar primeiro temporizador da lista
        addTimer(reason, url, rand, true);
        loadFirstTimer();
    }

    function getPage() {
        let page;
        let q = readQuerryParams(window.location.href);
        if (!q.Farm_page) {
            page = 0;
        } else {
            page = parseInt(q.Farm_page);
        }

        console.log('página atual', page);

        return page;
    }

    function getNextPage() {
        let page = getPage();
        let numPages = document.getElementsByClassName('paged-nav-item').length / 2;
        if (++page >= numPages) {
            page = 0;
        }

        return page;
    }

    function processReport() {
        console.log('Processando', config.currentIndex);

        if (config.currentIndex >= config.reports.length) {
            console.log('Concluído');
            let page = getNextPage();
            resetIndex();
            waitAndReload('Página Concluída.', page);
        } else if (config.reports[config.currentIndex].distance > config.distance) {
            resetIndex();
            waitAndReload('Raio ' + config.distance + ' Concluído.', 0);
        } else {
            setStatus('Relatório: ' + config.currentIndex + '/' + config.reports.length + (config.reports[config.currentIndex].full ? ' * ':'') + ' ...');

            // enviando POST
            let data = 'target=' + config.reports[config.currentIndex].target + '&template_id=' + config.currentTemplate.template_id + '&source=' + config.q.village + '&h=' + config.q.h;
            let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&' : '') + 'village=' + config.q.village + '&screen=am_farm&mode=farm&ajaxaction=farm&json=1&=';
            console.log(url, data);
            console.log(config.currentTemplate);

            GM_xmlhttpRequest ( {
                method:     'POST',
                url:        url,
                data:       data,
                headers:    {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'TribalWars-Ajax': '1',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                onload: function (response) {
                    console.log(response);

                    if (response.status == 200) {
                        let resp = JSON.parse(response.response);
                        console.log(resp);

                        if (resp.bot_protect) {
                            disableSession();
                            window.location.reload();
                        } else if (resp.response && resp.response.success) {
                            // se estiver cheio, enviar mais um
                            if (config.reports[config.currentIndex].full) {
                                config.reports[config.currentIndex].full = false;
                            } else {
                                config.currentIndex++;
                            }
                            startReportProcess(false);
                        } else if (resp.error && resp.error.length > 0) {
                            saveIndex();
                            waitAndReload(resp.error[0]);
                        }
                    } else {
                        setStatus('Falha ao enviar requisição: ', response.status);
                        console.log(response);
                    }
                }
            } );
        }
    }

    function setStatus(status) {
        config.inputs[''].innerHTML = status;
    }

    function readReports() {
        console.log('Lendo relatórios...');

        let elements = document.querySelectorAll('[id^=village_]');
        let reports = [];

        for (let i = 0; i < elements.length; ++i) {

            if (elements[i].className.startsWith('report_')) {
                let report = {};
                // obter alvo
                report.target = elements[i].id.substring(8);

                // obter distância
                report.distance = parseInt(elements[i].childNodes[15].innerHTML.split('.')[0]);

                // capacidade máxima
                report.full = elements[i].innerHTML.includes('Full haul');
                reports.push(report);
            }
        }

        config.reports = reports;
        console.log('Leitura de relatórios concluída.', reports);
    }

    function readScreenParams() {
        console.log('Lendo parâmetros...');

        // encontrar id da aldeia e código h
        let elements = document.getElementsByClassName('footer-link');
        for (let i = elements.length - 1; i >= 0; i--) {
            config.q = readQuerryParams(String(elements[i]));
            if (config.q.village) {
                break;
            }
        }

         // Ler modelos
        config.a = readTemplate(document.getElementsByClassName('farm_icon_a'));
        config.b = readTemplate(document.getElementsByClassName('farm_icon_b'));

        console.log('Leitura de parâmetros concluída.', config);
    }

    function readQuerryParams(url) {
        let params = {};
        let hh = url.substring(url.indexOf('?') + 1).split('&');

        // mover parâmetros para configuração
        for (let i = 0; i < hh.length; ++i) {
            let param = hh[i].split('=');
            params[param[0]] = param[1];
        }

        return params;
    }

    function readTemplate(elements) {
        if (elements.length < 2) {
            console.log('Modelo não encontrado ', elements);
        } else {
            let element = elements[1];
            console.log('Modelo encontrado ', element.outerHTML.split(', ')[2].split(')')[0]);
            return { 'template_id' : element.outerHTML.split(', ')[2].split(')')[0] };
        }
        return {};
    }

    // temporizador
    // Nome do Bot, Aldeia, url, tempo - Date().getTime();

    let timers;
    let timerTimeout = null;

    readTimers();

/*
    addTimer('1', 'url', 5000);
    addTimer('2', 'url', 10000);
    addTimer('4', 'url', 15000);
    addTimer('0', 'url', 3000);
    addTimer('3', 'url', 12000);
*/
    function readTimers() {
        console.log('Lendo temporizadores...');

        timers = {};

        let i = 0;
        while(true) {
            let key = localStorage.key(i++);

            if (!key) {
                break;
            }

            if (key.startsWith(scriptInitials)) {
                let item = JSON.parse(localStorage.getItem(key));
                console.log(key, '->', item);
                timers[key] = item;
            }
        }

        console.log('Leitura de temporizadores concluída.', timers);

        if (timerTimeout == null) {
            loadFirstTimer();
        }
    }

    function createTimersTable() {
        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';

        let body = document.createElement('tbody');
        table.appendChild(body);

        for (let timer in timers) {
            let tr = document.createElement('tr');
            body.appendChild(tr);

            let tdName = document.createElement('td');
            tdName.style = 'text-align:left;';
            tdName.innerHTML = timers[timer].name;
            tr.appendChild(tdName);

            let tdTime = document.createElement('td');
            tdTime.style = 'text-align:center;';
            tdTime.innerHTML = new Date(timers[timer].time).toLocaleTimeString();
            tr.appendChild(tdTime);

            let tdActions = document.createElement('td');
            tdActions.style = 'text-align:right;';

            let btnDelete = document.createElement('button');
            btnDelete.className = 'btn';
            btnDelete.innerHTML = 'X';
            btnDelete.onclick = function() {
                removeTimer(timer);
            };
            tdActions.appendChild(btnDelete);

            tr.appendChild(tdActions);
        }

        return table;
    }

    function loadFirstTimer() {
        console.log('Carregando primeiro temporizador...');

        let minTime = Infinity;
        let minTimer = null;

        for (let timer in timers) {
            if (timers[timer].time < minTime) {
                minTime = timers[timer].time;
                minTimer = timer;
            }
        }

        if (minTimer != null) {
            let timeLeft = minTime - Date.now();

            if (timeLeft < 0) {
                console.log('Temporizador expirado.');
                removeTimer(minTimer);
            } else {
                console.log('Próximo temporizador em', timeLeft, 'ms');
                timerTimeout = setTimeout(function() {
                    timerTimeout = null;
                    executeTimer(minTimer);
                }, timeLeft);
            }
        }
    }

    function addTimer(name, url, time, save) {
        console.log('Adicionando temporizador:', name, url, time);

        let timer = {
            name: name,
            url: url,
            time: Date.now() + time
        };

        timers[scriptInitials + '.' + name] = timer;
        if (save) {
            saveTimer(timer);
        }

        refreshTimersTable();
    }

    function removeTimer(timer) {
        console.log('Removendo temporizador:', timer);

        delete timers[timer];
        localStorage.removeItem(timer);

        refreshTimersTable();

        if (timerTimeout != null) {
            clearTimeout(timerTimeout);
            timerTimeout = null;
        }

        loadFirstTimer();
    }

    function saveTimer(timer) {
        console.log('Salvando temporizador:', timer);

        localStorage.setItem(scriptInitials + '.' + timer.name, JSON.stringify(timer));
    }

    function executeTimer(timer) {
        console.log('Executando temporizador:', timer);

        let item = timers[timer];
        if (item) {
            delete timers[timer];
            localStorage.removeItem(timer);
            refreshTimersTable();

            window.location.href = item.url;
        }

        loadFirstTimer();
    }

    function refreshTimersTable() {
        let timersDiv = document.querySelector('div.vis:nth-of-type(2)');
        timersDiv.innerHTML = '';
        timersDiv.appendChild(createTimersTable());
    }

    console.log('Script carregado.');
});
