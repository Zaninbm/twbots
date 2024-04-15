// ==UserScript==
// @name     Builder Helper
// @namespace   https://*.tribalwars.net
// @namespace   https://*.tribalwars.br
// @include     **screen=main*
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
        console.log('Lendo configuração de sessão ...');

        config.session = {};

        let i = 0;
        let prefix = scriptVillageName() + '.';

        while(true) {
            let key = sessionStorage.key(i++);

            if (!key) {
                break;
            }

            // processar apenas a configuração de script/vila atual
            if (key.startsWith(prefix)) {
                let item = key.substr(prefix.length);
                console.log(key + '->' + item);
                config.session[item] = sessionStorage.getItem(key);
            }
        }

        if (!config.session.state) {
            disableSession();
        }

        console.log('Configuração de sessão lida', config.session);
    }

    function saveSessionConfig() {
        console.log('Salvando configuração de sessão...', config.session);
        let prefix = scriptVillageName() + '.';

        for (let item in config.session) {
            let value = sessionStorage.getItem(prefix + item);
            if (!value || value != config.session[item]) {
                console.log('Salvando:', prefix + item, config.session[item]);
                sessionStorage.setItem(prefix + item, config.session[item]);
            } else {
                console.log('Não alterado:', prefix + item, config.session[item]);
            }
        }

        console.log('Configuração de sessão salva');
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
        console.log('Criando controles...');

        // Remover td inúteis
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

        // adicionar botões
        let btntable = document.createElement('table');
        btntable.className = 'vis';
        btntable.width = '100%';
        table.after(btntable);

        body = document.createElement('tbody');
        btntable.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

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

        tr0.appendChild(tdb);
        inputs.start = btn;

        // criar controles de temporizadores
        // criar div
        let timersDiv = document.createElement('div');
        timersDiv.className = 'vis';
        controlsDiv.after(timersDiv);

        h = document.createElement('h4');
        h.innerHTML = 'Fila de execução';
        timersDiv.appendChild(h);

        innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        timersDiv.appendChild(createTimersTable());
        console.log('Controles criados.', inputs);
    }

    function saveSelection() {
        saveSessionConfig();

        // adicionar aldeia à lista de temporizadores sem atraso
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

        setStatus('Iniciando...');

        startProcess(false);
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

    function startProcess(wait) {

        let min = wait ? (config.wait - 3) * 60000 : 600;
        let max = wait ? (config.wait + 3) * 60000 : 800;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);
        console.log('Aguardando ' + rand + ' milissegundos...');
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

        // adicionar à lista de temporizadores
        // carregar primeiro temporizador da lista
        addTimer(reason, url, time, true);
        loadFirstTimer();
    }

    function calculateDateTimeOffsets() {
        let date = document.getElementById('serverDate').innerHTML.split('/');
        let time = document.getElementById('serverTime').innerHTML.split(':');

        const server = new Date();
        server.setHours(parseInt(time[0]));
        server.setMinutes(parseInt(time[1]));
        server.setSeconds(parseInt(time[2]));

        const next = new Date();
        const lines = document.getElementsByClassName('lit-item');
        let left = -1;
        if (lines.length > 3) {
            let data = lines[3].firstChild.data;
            data = data.substring(data.lastIndexOf(' ') + 1);
            time = data.split(':');
            next.setHours(parseInt(time[0]));
            next.setMinutes(parseInt(time[1]));
            next.setSeconds(parseInt(time[2]));
            left = next.getTime() - server.getTime();
            if (left > 3 * 60000) {
                left = left - 3 * 60000 + 2000;
            }
        }
        return left;
    }

    function processBuild() {
        console.log('Processando...');

        // encontrar comprimento da fila atual
        var queue = document.querySelectorAll('[class*="buildorder_"]');
        console.log('Comprimento da fila', queue.length);

        let value = sessionStorage.getItem('OrdersQueue');

        if (value) {
            orders = JSON.parse(value);
        } else {
            orders = [];
        }

        let current = -1;

        for (let i = 0; i < orders.length; ++i) {
            const order = orders[i];
            console.log('Tentando', order.name, order.level);
            const node = readBuilding(order.name);
            if (node) {
                if (readLevel(node, order.name) < order.level) {
                    current = i;
                    break;
                }
            }
        }

        if (current > 0) {
            orders.splice(0, current);
            saveOrders();
        }

        if (orders.length == 0) {
            // não há mais pedidos de construção, continuar com outros bots
            loadFirstTimer();
            return;
        }

        console.log('Pedido atual', orders[0]);

        // Se a fila estiver muito longa
        if (queue.length > 4) {
            // esperar completar
            waitAndReload('Fila muito longa', 14 * 60000, 19 * 60000);
        } else {
            let btn;

            let node = readBuilding(orders[0].name);

            const options = node.getElementsByClassName('build_options');

            if (options && options.length > 0) {
                // verificar se a fazenda é necessária
                let inactive = options[0].getElementsByClassName('inactive center');
                if (inactive && inactive.length > 0) {
                    if (inactive[0].innerHTML.includes('Fazenda') && !isOrdered('fazenda')) {
                        node = readBuilding('fazenda');
                        orders.unshift({'name': 'fazenda', 'level': readLevel(node, 'fazenda') + 1});
                        saveOrders();
                        location.reload();
                    }
                }
                inactive = options[0].getElementsByClassName('inactive');
                if (inactive && inactive.length > 0) {
                    if (inactive[0].innerHTML.includes('Armazém') && !isOrdered('armazém')) {
                        node = readBuilding('armazém');
                        orders.unshift({'name': 'armazém', 'level': readLevel(node, 'armazém') + 1});
                        saveOrders();
                        location.reload();
                    }
                }
                const btns = options[0].getElementsByClassName('btn-build');
                if (btns && btns.length > 0) {
                    btn = btns[0];
                }
            }

            if (btn && btn.checkVisibility()) {
                btn.click();
                window.setTimeout(function() {
                    location.reload();
                }, 4000);
            } else {
                waitAndReload('Aguardando ' + orders[0].name, 14 * 60000, 19 * 60000);
            }
        }
    }

    function readBuildings() {
        let names = [
            'main',
            'quartel',
            'local',
            'estátua',
            'mercado',
            'madeira',
            'pedra',
            'ferro',
            'fazenda',
            'armazém',
            'esconderijo',
            'estábulo',
            'garagem',
            'academia',
            'ferreiro',
            'muralha'
        ];
        for (const name of names) {
            const building = readBuilding(name);
            if (building) {
              const level = readLevel(building, name);
              buildings[name] = { 'node' : building, 'level': level, 'added': level };
            }
        }
        console.log(buildings);
    }

    function createQueueControls() {
        // Ler fila
        let value = sessionStorage.getItem('OrdersQueue');

        if (value) {
            orders = JSON.parse(value);
        } else {
            orders = [];
        }

        // Criar interface do usuário
        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        table.id = 'bot_orders_table';

        const element = document.getElementById('contentContainer');

        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        element.after(controlsDiv);

        controlsDiv.appendChild(table);

        // Criar Controles
        let head = document.createElement('thead');
        table.appendChild(head);

        let tr = document.createElement('tr');
        head.appendChild(tr);

        let th = document.createElement('th');
        th.width = '5%';
        th.innerHTML = 'Del';
        tr.appendChild(th);

        th = document.createElement('th');
        th.width = '15%';
        th.innerHTML = 'Nome';
        tr.appendChild(th);

        th = document.createElement('th');
        th.width = '20%';
        th.innerHTML = 'Nível';
        tr.appendChild(th);

        th = document.createElement('th');
        th.width = '60%';
        th.innerHTML = 'Ações';
        tr.appendChild(th);

        let body = document.createElement('tbody');
        table.appendChild(body);

        for (let i = 0; i < orders.length; ++i) {
            const order = orders[i];
            const node = readBuilding(order.name);
            if (node) {
                tr = document.createElement('tr');
                body.appendChild(tr);

                let td = document.createElement('td');
                td.align = 'center';
                tr.appendChild(td);

                let btn = document.createElement('input');
                btn.className = 'btn-delete';
                btn.type = 'button';
                btn.value = 'X';
                btn.addEventListener('click', function() {
                    orders.splice(i, 1);
                    saveOrders();
                    location.reload();
                }, false);
                td.appendChild(btn);

                td = document.createElement('td');
                td.innerHTML = order.name;
                tr.appendChild(td);

                td = document.createElement('td');
                td.innerHTML = order.level;
                tr.appendChild(td);

                td = document.createElement('td');
                tr.appendChild(td);

                const options = node.getElementsByClassName('build_options');

                if (options && options.length > 0) {
                    const btns = options[0].getElementsByClassName('btn-build');
                    if (btns && btns.length > 0) {
                        btn = btns[0];
                        td.appendChild(btn);
                    }
                }
            }
        }
    }

    function readBuilding(name) {
        return document.getElementById('buildqueue').querySelector('[data-building="' + name + '"]');
    }

    function readLevel(node, name) {
        return parseInt(node.querySelector('[data-building="' + name + '"]').getElementsByClassName('lvl')[0].innerText);
    }

    function isOrdered(name) {
        for (const order of orders) {
            if (order.name === name) {
                return true;
            }
        }
        return false;
    }

    function saveOrders() {
        sessionStorage.setItem('OrdersQueue', JSON.stringify(orders));
    }

    function loadFirstTimer() {
        let timers = JSON.parse(sessionStorage.getItem('timers'));

        if (timers && timers.length > 0) {
            let timer = timers[0];

            timers.splice(0, 1);
            sessionStorage.setItem('timers', JSON.stringify(timers));

            let url = timer.url;

            let time = Math.floor(Math.random() * (timer.max - timer.min + 1) + timer.min);
            let left = calculateDateTimeOffsets();

            if (left > 0 && left < time) {
                time = left;
            }

            addTimer(timer.reason, url, time, false);
        } else {
            // todo: atualizar dados?
            //window.location.reload();
        }
    }

    function addTimer(reason, url, time, now) {
        console.log('Adicionando temporizador', reason, url, time, now);

        let timers = JSON.parse(sessionStorage.getItem('timers'));

        if (!timers) {
            timers = [];
        }

        let timer = {'reason': reason, 'url': url, 'time': time};

        if (now) {
            timers.unshift(timer);
        } else {
            timers.push(timer);
        }

        sessionStorage.setItem('timers', JSON.stringify(timers));

        console.log('Temporizador adicionado');
    }

    function setStatus(status) {
        let statusDiv = document.getElementById('status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'status';
            statusDiv.style.color = scriptTimerColor;
            document.getElementById('content_value').appendChild(statusDiv);
        }
        statusDiv.innerHTML = status;
    }

    function createTimersTable() {
        let timers = JSON.parse(sessionStorage.getItem('timers'));

        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';

        if (timers) {
            let head = document.createElement('thead');
            table.appendChild(head);

            let tr = document.createElement('tr');
            head.appendChild(tr);

            let th = document.createElement('th');
            th.width = '20%';
            th.innerHTML = 'Tempo';
            tr.appendChild(th);

            th = document.createElement('th');
            th.width = '50%';
            th.innerHTML = 'Razão';
            tr.appendChild(th);

            th = document.createElement('th');
            th.width = '30%';
            th.innerHTML = 'Ações';
            tr.appendChild(th);

            let body = document.createElement('tbody');
            table.appendChild(body);

            for (let i = 0; i < timers.length; ++i) {
                const timer = timers[i];
                tr = document.createElement('tr');
                body.appendChild(tr);

                let td = document.createElement('td');
                td.innerHTML = timer.time;
                tr.appendChild(td);

                td = document.createElement('td');
                td.innerHTML = timer.reason;
                tr.appendChild(td);

                td = document.createElement('td');
                tr.appendChild(td);

                let btn = document.createElement('input');
                btn.className = 'btn-delete';
                btn.type = 'button';
                btn.value = 'Cancelar';
                btn.addEventListener('click', function() {
                    timers.splice(i, 1);
                    sessionStorage.setItem('timers', JSON.stringify(timers));
                    location.reload();
                }, false);
                td.appendChild(btn);
            }
        }

        return table;
    }

    function processFastCompletion() {
        let btns = document.querySelectorAll('[id*="btn_build_fast"]');
        for (const btn of btns) {
            btn.click();
        }
    }

    function readScreenParams() {
        let q = {};
        const urlParams = new URLSearchParams(window.location.search);
        q.village = urlParams.get('village');
        q.t = urlParams.get('t');
        config.q = q;
    }
});
