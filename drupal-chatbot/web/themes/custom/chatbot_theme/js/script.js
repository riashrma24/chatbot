(function (Drupal, once) {
    Drupal.behaviors.chatbot = {
        attach(context) {
            once('chatbot', '#chatbot', context).forEach((chatbot) => {
                const toggle = chatbot.querySelector('#chatbot-toggle')
                const panel = chatbot.querySelector('#chatbot-panel')
                const close = chatbot.querySelector('#chatbot-close')
                const socket = new WebSocket('ws://127.0.0.1:8000/ws/chat')
                const input = chatbot.querySelector('#chatbot-input')
                const send = chatbot.querySelector('#chatbot-send')
                let conversationId = null
                let currentBotMessage = null
                let currentPath = window.location.pathname
                console.log("heereeee")

                const savedConversationId = localStorage.getItem('chatbot_conversation_id')
                if (savedConversationId) {
                    conversationId = Number(savedConversationId);
                    console.log('Restored conversation id : ', conversationId)
                }

                socket.onopen = () => {
                    console.log('connected to be')
                    socket.send(JSON.stringify({
                        type: "init",
                        site: {
                            siteName: "Drupal Chatbot"
                        },
                        currentPath: currentPath
                    }));
                }

                socket.onclose = () => {
                    console.log('disconnected from chatbot be')
                }

                socket.onerror = (error) => {
                    console.log('websocket error : ', error)
                }

                socket.onmessage = (event) => {
                    const data = JSON.parse(event.data)
                    console.log('recieved : ', data)

                    if (data.type === 'conversation_id') {
                        conversationId = data.conversation_id;
                        localStorage.setItem("chatbot_conversation_id", conversationId);
                        console.log('conversation id : ', conversationId);
                        return;
                    }

                    if (data.type === 'chunk') {
                        if (currentBotMessage) {
                            currentBotMessage.textContent += data.content
                        }
                        const messages = chatbot.querySelector('#chatbot-messages')
                        messages.scrollTop = messages.scrollHeight
                    }
                    if (data.type === 'navigate') {
                        console.log("navigation request to path : ", data.path)
                        // window.location.href = data.path
                        softNavigate(data.path);
                    }
                    if (data.type === 'done') {
                        currentBotMessage = null;
                    }
                }

                toggle.addEventListener("click", () => {
                    panel.hidden = false;
                    toggle.hidden = true;
                })
                close.addEventListener("click", () => {
                    panel.hidden = true;
                    toggle.hidden = false;
                })

                function sendMessage() {
                    const message = input.value.trim()
                    if (!message) return;

                    addMessage('user', message)
                    currentBotMessage = addMessage("bot", "");
                    socket.send(JSON.stringify({
                        type: 'message',
                        message: message,
                        conversation_id: conversationId,
                        currentPath: currentPath
                    }))
                    console.log("Sent:", message);
                    input.value = ""
                }

                function addMessage(sender, text) {
                    const message = document.createElement('div');
                    message.classList.add('chatbot-message', sender);
                    const strong = document.createElement('strong')
                    strong.textContent = sender === 'user' ? 'you: ' : 'bot: '
                    const content = document.createElement('span')
                    content.textContent = text;
                    message.appendChild(strong)
                    message.appendChild(content)
                    const messages = chatbot.querySelector('#chatbot-messages')
                    messages.appendChild(message)
                    messages.scrollTop = messages.scrollHeight;
                    return content;

                }

                async function loadConversationHistory() {
                    if (!conversationId) return;
                    try {
                        const response = await fetch(`http://127.0.0.1:8000/conversations/${conversationId}/messages`)
                        if (!response.ok) {
                            console.log('Failed to load conversation history')
                            return;
                        }
                        const messages = await response.json()
                        console.log('Conversation history : ', messages);
                        messages.forEach((message) => {
                            const sender = message.role === 'user' ? 'user' : 'bot';
                            addMessage(sender, message.content)
                        });

                    } catch (error) {
                        console.log('Error in loading conversation history')
                    }
                }

                function loadCss(url) {
                    return new Promise((resolve) => {
                        if (document.querySelector(`link[href="${url}"]`)) {
                            resolve();
                            return;
                        }

                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = url;
                        link.onload = () => resolve();
                        link.onerror = () => {
                            console.log('Failed to load CSS:', url);
                            resolve();
                        };

                        document.head.appendChild(link);
                    });
                }

                const loadedJs = new Set();

                function loadJs(url) {
                    if (loadedJs.has(url)) {
                        return Promise.resolve();
                    }

                    if (document.querySelector(`script[src="${url}"]`)) {
                        loadedJs.add(url);
                        return Promise.resolve();
                    }

                    return fetch(url)
                        .then((response) => response.text())
                        .then((code) => {
                            const script = document.createElement('script');
                            script.textContent = `(function () {\n${code}\n})();`;
                            document.head.appendChild(script);
                            loadedJs.add(url);
                        })
                        .catch((error) => {
                            console.log('Failed to load JS:', url, error);
                        });
                }

                const loadedInlineCss = new Set();

                function loadInlineCss(code) {
                    if (loadedInlineCss.has(code)) return;
                    loadedInlineCss.add(code);

                    const style = document.createElement('style');
                    style.textContent = code;
                    document.head.appendChild(style);
                }

                const loadedInlineJs = new Set();

                function loadInlineJs(code) {
                    if (loadedInlineJs.has(code)) return;
                    loadedInlineJs.add(code);

                    const script = document.createElement('script');
                    script.textContent = `(function () {\n${code}\n})();`;
                    document.head.appendChild(script);
                }

                async function loadAssets(cssUrls = [], jsUrls = [], inlineCss = [], inlineJs = []) {
                    await Promise.all(cssUrls.map(loadCss));
                    inlineCss.forEach(loadInlineCss);

                    for (const url of jsUrls) {
                        await loadJs(url);
                    }
                    inlineJs.forEach(loadInlineJs);
                }

                async function softNavigate(path, pushHistory = true) {
                    try {
                        const response = await fetch(
                            `/chatbot/navigate?path=${encodeURIComponent(path)}`
                        );

                        if (!response.ok) {
                            console.log('Soft navigation failed');
                            return;
                        }

                        const commands = await response.json();

                        let insertedElement = null;
                        let assets = { css: [], js: [], inlineCss: [], inlineJs: [] };

                        commands.forEach((command) => {
                            if (command.command === 'insert') {
                                const element = document.querySelector(command.selector);

                                if (!element) {
                                    console.log('Element not found:', command.selector);
                                    return;
                                }

                                const wrapper = document.createElement('div');
                                wrapper.innerHTML = command.data;

                                const newElement = wrapper.firstElementChild;

                                element.replaceWith(newElement);

                                insertedElement = newElement;
                            }

                            if (command.command === 'loadAssets') {
                                assets.css = command.css || [];
                                assets.js = command.js || [];
                                assets.inlineCss = command.inlineCss || [];
                                assets.inlineJs = command.inlineJs || [];
                            }
                        });

                        await loadAssets(assets.css, assets.js, assets.inlineCss, assets.inlineJs);

                        // Aggregated JS bundles include Drupal core itself, which
                        // reassigns `window.Drupal` to a brand-new object on load.
                        // Our closures here still hold the original `Drupal`
                        // reference, so newly-registered behaviors (e.g. from a
                        // freshly-loaded SDC component) land on window.Drupal but
                        // not on our reference. Merge them back before attaching.
                        if (window.Drupal.behaviors !== Drupal.behaviors) {
                            Object.assign(Drupal.behaviors, window.Drupal.behaviors);
                        }

                        if (insertedElement) {
                            Drupal.attachBehaviors(insertedElement);
                        }

                        if (pushHistory) {
                            history.pushState({}, '', path);
                        }

                        currentPath = path;

                    } catch (error) {
                        console.log('Soft navigation error:', error);
                    }
                }

                send.addEventListener('click', sendMessage)

                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                    }
                })

                window.addEventListener('popstate', () => {
                    const path = window.location.pathname;
                    console.log('path : ', path);
                    currentPath = path;
                    softNavigate(path, false)
                })

                loadConversationHistory();
            })
        }
    }
})(Drupal, once)