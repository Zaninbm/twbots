// ==UserScript==
// @name     Builder Helper
// @namespace   https://*.tribalwars.br
// @namespace   https://*.tribalwars.net
// @include     ***screen=main*
// @version     1.1
// @grant       GM_xmlhttpRequest
// ==/UserScript==


$(document).ready(function() {

    let scriptInitials = 'BB';
    let scriptFriendlyName = 'Build Bot';
    let scriptTimerColor = '#FF7F50';
    let config = {};
    let buildings = {};
    let orders;

    readScreenParams();
    readSessionConfig();
    readSessionState();
    createControls();

    // Click ready regardless of script state
    processFastCompletion();

    // start the rest only after faster completion

    function scriptVillageName() {
        return scriptInitials + '.' + config.q.village;
    }

    function readSessionConfig() {
        console.log('Reading session config ...');

        config.session = {};

        let i = 0;
        let prefix = scriptVillageName() + '.';

        while(true) {
            let key = sessionStorage.key(i++);

            if (!key) {
                break;
            }

            // process only current script/village config
            if (key.startsWith(prefix)) {
                let item = key.substr(prefix.length);
                console.log(key + '->' + item);
                config.session[item] = sessionStorage.getItem(key);
            }
        }

        if (!config.session.state) {
            disableSession();
        }

        console.log('Session config read', config.session);
    }

    function saveSessionConfig() {
        console.log('Saving session config ...', config.session);
        let prefix = scriptVillageName() + '.';

        for (let item in config.session) {
            let value = sessionStorage.getItem(prefix + item);
            if (!value || value != config.session[item]) {
                console.log('Saving:', prefix + item, config.session[item]);
                sessionStorage.setItem(prefix + item, config.session[item]);
            } else {
                console.log('Not changed:', prefix + item, config.session[item]);
            }
        }

        console.log('Session config saved');
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

    function createControls() {
        console.log('Creating controls ...');

        // Remove useless td
        document.getElementById('content_value').getElementsByTagName('table')[0].remove();

        let inputs = {};

        const element = document.getElementById('contentContainer');

        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        element.before(controlsDiv);

        let h = document.createElement('h4');
        h.innerHTML = scriptFriendlyName;
        controlsDiv.appendChild(h);

        let innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        innerDiv.appendChild(table);

        let body = document.createElement('tbody');
        table.appendChild(body);

        // add buttons
        let btntable = document.createElement('table');
        btntable.className = 'vis';
        btntable.width = '100%';
        table.after(btntable);

        body = document.createElement('tbody');
        btntable.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

        // save
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

        // start
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

        tr0.appendChild(tdb);
        inputs.start = btn;

        // create timers control
        // create div
        let timersDiv = document.createElement('div');
        timersDiv.className = 'vis';
        controlsDiv.after(timersDiv);

        h = document.createElement('h4');
        h.innerHTML = 'Fila de execução';
        timersDiv.appendChild(h);

        innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        timersDiv.appendChild(createTimersTable());
        console.log('Controls created.', inputs);
    }

    function saveSelection() {
        saveSessionConfig();

        // add vilalge to timers list with no delay
        addTimer('Pronto para iniciar', pageUrl(), 0, true);
    }

    function pageUrl() {
        let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&': '') + 'village=' + config.q.village + '&screen=main';
        return url;
    }

    function disablecontrols() {
    }

    function start() {

        disablecontrols();

        setStatus('Iniciando ...');

        startProcess(false);
    }

    function activate() {
        saveSelection();
        disablecontrols();

        setStatus('Iniciando ...');
        enableSession();
        loadFirstTimer();
    }

    function deactivate() {
        disableSession();
        window.location.reload();
    }

    function startProcess(wait) {

        let min = wait ? (config.wait - 3) * 60000 : 600;
        let max = wait ? (config.wait + 3) * 60000 : 800;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);
        console.log('Esperando por ' + rand + ' milissegundos ...');
        window.setTimeout(function() {
            processBuild();
        }, rand);

        var date = new Date(Date.now() + rand);
        return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    function waitAndReload(reason, min, max) {

        setStatus(reason);

        let time = Math.floor(Math.random() * (max - min + 1) + min);


        let left = calculateDateTimeOffsets();

        if (left > 0 && left < time) {
            time = left;
        }
        let url = pageUrl();

        // add to timers list
        // load first timer in list
        addTimer(reason, url, time, true);
        loadFirstTimer();
    }

    function calculateDateTimeOffsets() {
        let date = document.getElementById('serverDate').innerText.trim();
        let serverOffset = document.getElementById('serverTime').innerText.trim().split(':');
        let serverDateTime = new Date(Date.parse(date));
        serverDateTime.setHours(serverOffset[0]);
        serverDateTime.setMinutes(serverOffset[1]);
        serverDateTime.setSeconds(serverOffset[2]);

        let villageOffset = config.time.split(':');
        let villageDateTime = new Date(serverDateTime);
        villageDateTime.setHours(villageDateTime.getHours() + parseInt(villageOffset[0]));
        villageDateTime.setMinutes(villageDateTime.getMinutes() + parseInt(villageOffset[1]));
        villageDateTime.setSeconds(villageDateTime.getSeconds() + parseInt(villageOffset[2]));

        let currentDateTime = new Date(Date.parse(document.getElementById('timing').innerText.trim()));
        let diff = villageDateTime - currentDateTime;

        return diff;
    }

    function processBuild() {
        // Check if script is enabled
        if (!isEnabled()) {
            setStatus('Script desativado.');
            return;
        }

        if (config.session.running) {
            console.log('Build running...');
            setStatus('Construção em andamento...');
            return;
        }

        setStatus('Verificando construções...');

        let buildingQueue = document.getElementById('buildqueue').getElementsByTagName('li');

        if (buildingQueue.length > 0) {
            console.log('Aguardando fila de construção...');
            setStatus('Fila de construção ocupada. Aguardando...');
            waitAndReload('Construções em andamento', 5, 10);
            return;
        }

        let buildButton = document.getElementById('build');
        if (buildButton) {
            buildButton.click();
            console.log('Construindo...');
            setStatus('Construindo...');
        } else {
            console.log('Sem construções disponíveis.');
            setStatus('Sem construções disponíveis.');
            waitAndReload('Sem construções disponíveis', 5, 10);
        }
    }

    function setStatus(status) {
        console.log(status);
        document.getElementById('status').innerHTML = status;
    }

    function processFastCompletion() {
        // Pronto para continuar
        let readyButton = document.getElementById('ready');

        if (readyButton) {
            readyButton.click();
            console.log('Continuando...');
            setStatus('Continuando...');
        }
    }

    function createTimersTable() {
        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';

        let body = document.createElement('tbody');
        table.appendChild(body);

        let tr = document.createElement('tr');
        body.appendChild(tr);

        let th = document.createElement('th');
        th.innerHTML = 'Status';
        tr.appendChild(th);

        th = document.createElement('th');
        th.innerHTML = 'Tempo';
        tr.appendChild(th);

        th = document.createElement('th');
        th.innerHTML = 'Ação';
        tr.appendChild(th);

        let td = document.createElement('td');
        td.colSpan = '3';
        td.id = 'timers';
        body.appendChild(td);

        return table;
    }

    function addTimer(status, url, time, start) {
        let tr = document.createElement('tr');
        let timers = document.getElementById('timers');
        timers.appendChild(tr);

        let td = document.createElement('td');
        td.innerHTML = status;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = formatTime(time);
        tr.appendChild(td);

        td = document.createElement('td');
        let btn = document.createElement('input');
        btn.className = 'btn';
        btn.value = 'Remover';
        btn.type = 'button';
        btn.addEventListener('click', removeTimer.bind(null, tr), false);
        td.appendChild(btn);
        tr.appendChild(td);

        if (start) {
            td = document.createElement('td');
            btn = document.createElement('input');
            btn.className = 'btn';
            btn.value = 'Iniciar';
            btn.type = 'button';
            btn.addEventListener('click', loadFirstTimer, false);
            td.appendChild(btn);
            tr.appendChild(td);
        }
    }

    function loadFirstTimer() {
        let timers = document.getElementById('timers').getElementsByTagName('tr');
        if (timers.length > 1) {
            console.log('Loading next timer...');
            let url = timers[1].cells[0].innerHTML;
            let time = parseTime(timers[1].cells[1].innerHTML);
            console.log('Loaded:', url, time);
            timers[1].remove();
            window.setTimeout(function() {
                window.location.href = url;
            }, time);
        }
    }

    function removeTimer(tr) {
        tr.remove();
    }

    function formatTime(time) {
        let hours = Math.floor(time / 3600000);
        let minutes = Math.floor((time % 3600000) / 60000);
        let seconds = Math.floor((time % 60000) / 1000);
        return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    }

    function parseTime(time) {
        let parts = time.split(':');
        let hours = parseInt(parts[0]);
        let minutes = parseInt(parts[1]);
        let seconds = parseInt(parts[2]);
        return hours * 3600000 + minutes * 60000 + seconds * 1000;
    }

    // Se o script estiver ativado, ele vai começar o processo de construção
    if (isEnabled()) {
        start();
    }
});

