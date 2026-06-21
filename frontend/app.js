AOS.init({ duration: 600, once: true, offset: 60 });

        // Navbar scroll
        window.addEventListener('scroll', () => {
            document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
        });

        // Mobile nav
        function toggleMobileNav() {
            document.getElementById('navLinks').classList.toggle('active');
        }

        // University to Area mapping (frontend mirror of backend)
        const UNIVERSITY_AREA_MAP = {
            "Taylor's University": ["Subang Jaya", "Lakeside Campus"],
            "Sunway University": ["Bandar Sunway"],
            "Monash University Malaysia": ["Bandar Sunway"],
            "UCSI University": ["Cheras", "Taman Connaught"],
            "Asia Pacific University (APU)": ["Bukit Jalil"],
            "University of Malaya (UM)": ["Petaling Jaya", "Kerinchi"],
            "Universiti Putra Malaysia (UPM)": ["Serdang"],
            "HELP University": ["Damansara Heights"],
            "INTI International College": ["Kuala Lumpur City Centre"],
            "Multimedia University (MMU) Cyberjaya": ["Cyberjaya"]
        };

        // All areas in Klang Valley
        const ALL_AREAS = ["Subang Jaya", "Bandar Sunway", "Petaling Jaya", "Cheras", "Bukit Jalil", 
            "Cyberjaya", "Damansara Heights", "Kuala Lumpur City Centre", "Serdang", "Lakeside Campus", 
            "Taman Connaught", "Kerinchi", "Shah Alam", "Kajang", "Puchong"];

        // Update area dropdown based on university selection
        function updateAreaOptions() {
            const uni = document.getElementById('qUni').value;
            const areaSelect = document.getElementById('qArea');
            const currentArea = areaSelect.value;
            
            // Get mapped areas for selected university
            let mappedAreas = [];
            if (uni && UNIVERSITY_AREA_MAP[uni]) {
                mappedAreas = UNIVERSITY_AREA_MAP[uni];
            }
            
            // Filter by what's actually available in database
            const availableAreas = window.availableAreas || ALL_AREAS;
            let areas = mappedAreas.length > 0 
                ? mappedAreas.filter(area => availableAreas.includes(area))
                : availableAreas;
            
            // Build options - show placeholder only when no university selected
            let options = uni ? '' : '<option value="">Select Area</option>';
            areas.forEach(area => {
                options += `<option value="${area}">${area}</option>`;
            });
            areaSelect.innerHTML = options;
            
            // Auto-select first area if university is selected and no valid current selection
            if (uni && areas.length > 0) {
                if (!currentArea || !areas.includes(currentArea)) {
                    areaSelect.value = areas[0]; // Auto-select first area
                } else {
                    areaSelect.value = currentArea; // Keep valid selection
                }
            }
        }

        // Quick search redirect
        function quickSearch() {
            const uni = document.getElementById('qUni').value;
            const area = document.getElementById('qArea').value;
            const type = document.getElementById('qType').value;
            let params = new URLSearchParams();
            if (uni) params.set('university', uni);
            if (area) params.set('area', area);
            if (type) params.set('type', type);
            window.location.href = `/listings.html${params.toString() ? '?' + params : ''}`;
        }

        // Load featured listings
        async function loadFeatured() {
            try {
                const res = await fetch('/api/listings?limit=3&isFeatured=true');
                const data = await res.json();
                let listings = data.data || [];
                if (!listings.length) {
                    const all = await fetch('/api/listings?limit=3');
                    const allData = await all.json();
                    listings = allData.data || [];
                }

                // Calculate total individual rooms (sum of bedrooms across all properties)
                const totalRooms = listings.reduce((sum, l) => sum + (l.bedrooms || 1), 0);
                document.getElementById('statTotalRooms').textContent = totalRooms;
                document.getElementById('wvTotalRooms').textContent = totalRooms;

                const grid = document.getElementById('featuredGrid');
                if (!listings.length) {
                    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-text-muted);"><i class="fas fa-building" style="font-size:2rem;margin-bottom:0.75rem;display:block;opacity:0.3;"></i><p>No listings yet. Check back soon.</p></div>`;
                    return;
                }

                grid.innerHTML = listings.map(l => `
                    <div class="listing-card" data-aos="fade-up">
                        <div class="listing-image">
                            <img src="${l.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'}" alt="${l.title}" loading="lazy">
                            ${l.isFeatured ? '<span class="listing-badge badge-featured">Featured</span>' : ''}
                            <div class="listing-price">RM ${l.price}<span>/${l.pricePeriod}</span></div>
                        </div>
                        <div class="listing-content">
                            <div class="listing-meta">
                                <span class="listing-type">${l.propertyType.replace('_',' ')}</span>
                                ${l.location?.university ? `<span class="listing-badge badge-university" style="position:static;margin-left:4px;">Near ${l.location.university}</span>` : ''}
                            </div>
                            <h3 class="listing-title">${l.title}</h3>
                            <div class="listing-location">
                                <i class="fas fa-map-marker-alt" style="color:var(--color-accent)"></i>
                                ${l.location?.area || l.location?.city || 'Klang Valley'}
                            </div>
                            <div class="listing-features">
                                ${l.bedrooms ? `<div class="listing-feature"><i class="fas fa-bed"></i> ${l.bedrooms} BR</div>` : ''}
                                ${l.bathrooms ? `<div class="listing-feature"><i class="fas fa-bath"></i> ${l.bathrooms} BA</div>` : ''}
                                <div class="listing-feature"><i class="fas fa-user-friends"></i> Max ${l.maxOccupants || 1}</div>
                            </div>
                            <div class="listing-actions">
                                <a href="/listing.html?id=${l._id}" class="btn btn-primary btn-sm" style="flex:1;justify-content:center;" target="_self">
                                    <i class="fas fa-eye"></i> View & Enquire
                                </a>
                            </div>
                        </div>
                    </div>
                `).join('');

                if (window.AOS) AOS.refresh();
            } catch(e) {
                document.getElementById('featuredGrid').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-text-muted);"><p>Could not load listings right now.</p></div>`;
            }
        }

        // Contact form
        async function submitContact() {
            const name = document.getElementById('cName').value;
            const email = document.getElementById('cEmail').value;
            const university = document.getElementById('cUni').value;
            const message = document.getElementById('cMsg').value;
            if (!name || !email || !message) { alert('Please fill in all required fields.'); return; }
            try {
                await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, university, message, source: 'contact_form' })
                });
                alert('Message sent! We\'ll get back to you soon.');
                document.getElementById('cName').value = '';
                document.getElementById('cEmail').value = '';
                document.getElementById('cMsg').value = '';
            } catch { alert('Something went wrong. Please try WhatsApp instead.'); }
        }

        // Chat widget - COMPLETE REWRITE FOR RELIABILITY
        let chatOpen = false;
        let chatSessionId = null;
        let chatSocket = null;
        let chatUserInfo = { name: '', phone: '', email: '' };
        let typingTimeout = null;
        let adminConnected = false;
        let lastMessageTime = 0; // Simple time-based dedup (legacy)
        const processedMessageIds = new Set(); // Track displayed messages to prevent duplicates

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Load saved session from localStorage
        function loadChatSession() {
            try {
                const saved = localStorage.getItem('chatSession');
                if (saved) {
                    const session = JSON.parse(saved);
                    if (session && session.sessionId) {
                        chatSessionId = session.sessionId;
                        chatUserInfo = session.userInfo || { name: '', phone: '', email: '' };
                        console.log('Chat session loaded:', chatSessionId, chatUserInfo);
                        return true;
                    }
                }
            } catch (e) {
                console.error('Failed to load chat session:', e);
                localStorage.removeItem('chatSession');
            }
            chatSessionId = null;
            chatUserInfo = { name: '', phone: '', email: '' };
            return false;
        }

        // Save session to localStorage
        function saveChatSession() {
            try {
                if (chatSessionId && chatUserInfo.name) {
                    const sessionData = {
                        sessionId: chatSessionId,
                        userInfo: chatUserInfo,
                        savedAt: new Date().toISOString()
                    };
                    localStorage.setItem('chatSession', JSON.stringify(sessionData));
                    console.log('Chat session saved:', sessionData);
                }
            } catch (e) {
                console.error('Failed to save chat session:', e);
            }
        }

        // Clear session (exit chat)
        function clearChatSession() {
            localStorage.removeItem('chatSession');
            chatSessionId = null;
            chatUserInfo = { name: '', phone: '', email: '' };
            adminConnected = false;
            lastMessageTime = 0;
            console.log('Chat session cleared');
        }

        // Load chat history from server
        async function loadChatHistory(sessionId) {
            if (!sessionId) return;
            try {
                console.log('Loading chat history for:', sessionId);
                const res = await fetch(`/api/chat/${sessionId}`);
                const data = await res.json();
                if (data.success && data.data && data.data.length > 0) {
                    renderChatHistory(data.data);
                    return true;
                }
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
            return false;
        }

        // Render chat history
        function renderChatHistory(messages) {
            const area = document.getElementById('chatMessagesArea');
            if (!area) return;
            
            // Clear and add welcome message
            area.innerHTML = '<div class="chat-welcome">Welcome back! Continuing your conversation...</div>';
            
            messages.forEach(msg => {
                if (msg.senderType === 'system') return; // Skip system messages
                
                const bubble = document.createElement('div');
                const senderType = msg.senderType || (msg.isAdmin ? 'human' : 'visitor');
                
                if (senderType === 'visitor') {
                    bubble.className = 'chat-bubble chat-bubble-visitor';
                    bubble.textContent = msg.message;
                } else if (senderType === 'ai') {
                    bubble.className = 'chat-bubble chat-bubble-ai';
                    bubble.innerHTML = `
                        <div class="sender-label"><i class="fas fa-robot"></i> AI Assistant</div>
                        <div>${escapeHtml(msg.message)}</div>
                    `;
                } else {
                    bubble.className = 'chat-bubble chat-bubble-human';
                    const adminName = msg.name || 'Agent';
                    bubble.innerHTML = `
                        <div class="sender-label"><i class="fas fa-user-headset"></i> ${escapeHtml(adminName)}</div>
                        <div>${escapeHtml(msg.message)}</div>
                    `;
                }
                area.appendChild(bubble);
            });
            
            area.scrollTop = area.scrollHeight;
            console.log('Chat history rendered:', messages.length, 'messages');
        }

        // Start new chat session with user info
        async function startChatSession() {
            const nameInput = document.getElementById('chatUserName');
            const phoneInput = document.getElementById('chatUserPhone');
            const emailInput = document.getElementById('chatUserEmail');
            
            if (!nameInput || !phoneInput) {
                console.error('Chat form inputs not found');
                return;
            }
            
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const email = emailInput.value.trim();
            
            if (!name || !phone) {
                alert('Please enter your name and phone number');
                return;
            }
            
            chatUserInfo = { name, phone, email };
            
            // Create session on server
            try {
                console.log('Creating chat session...');
                const res = await fetch('/api/chat/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: 'landing_page', name, phone, email })
                });
                const data = await res.json();
                
                if (!data.success || !data.data?._id) {
                    throw new Error('Failed to create session');
                }
                
                chatSessionId = data.data._id;
                console.log('Chat session created:', chatSessionId);
                
                // Save to localStorage immediately
                saveChatSession();
                
                // JOIN SOCKET ROOM NOW (socket already connected at this point)
                if (chatSocket && chatSocket.connected) {
                    console.log('🟢 Joining socket room after session create:', chatSessionId);
                    chatSocket.emit('join_chat', chatSessionId);
                }
                
                // Show chat interface
                showChatInterface();
                
                // Send welcome message
                const welcomeMsg = `Hi, my name is ${name}. I'm looking for a room.`;
                const area = document.getElementById('chatMessagesArea');
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble chat-bubble-visitor';
                bubble.textContent = welcomeMsg;
                area.appendChild(bubble);
                area.scrollTop = area.scrollHeight;
                
                // Send via socket if connected, otherwise REST
                await sendMessageToServer(chatSessionId, welcomeMsg, name, email, phone);
                
            } catch (e) {
                console.error('Failed to start chat session:', e);
                alert('Failed to start chat. Please try again.');
            }
        }

        // Helper to send message (socket or REST)
        async function sendMessageToServer(sessionId, message, name, email, phone) {
            if (!sessionId || !message) return;
            
            // Try socket first
            if (chatSocket && chatSocket.connected) {
                console.log('Sending via socket...');
                chatSocket.emit('send_message', {
                    sessionId,
                    message,
                    name: name || chatUserInfo.name,
                    email: email || chatUserInfo.email,
                    phone: phone || chatUserInfo.phone
                });
                return;
            }
            
            // Fallback to REST
            console.log('Socket not connected, using REST...');
            try {
                await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        message,
                        name: name || chatUserInfo.name,
                        email: email || chatUserInfo.email,
                        phone: phone || chatUserInfo.phone,
                        isAdmin: false
                    })
                });
            } catch (e) {
                console.error('Failed to send message via REST:', e);
            }
        }

        // Show chat interface (hide pre-form, show messages)
        function showChatInterface() {
            const preForm = document.getElementById('chatPreForm');
            const messagesArea = document.getElementById('chatMessagesArea');
            const inputRow = document.getElementById('chatInputRow');
            const status = document.getElementById('chatHeaderStatus');
            
            if (preForm) preForm.style.display = 'none';
            if (messagesArea) messagesArea.style.display = 'block';
            if (inputRow) inputRow.style.display = 'flex';
            if (status) status.textContent = adminConnected ? 'Agent online' : (chatUserInfo.name || 'Online');
            
            console.log('Chat interface shown');
        }

        // Show pre-chat form
        function showPreChatForm() {
            const preForm = document.getElementById('chatPreForm');
            const messagesArea = document.getElementById('chatMessagesArea');
            const inputRow = document.getElementById('chatInputRow');
            const status = document.getElementById('chatHeaderStatus');
            
            if (preForm) preForm.style.display = 'flex';
            if (messagesArea) {
                messagesArea.style.display = 'none';
                messagesArea.innerHTML = '<div class="chat-welcome">Hi! 👋 Looking for a room near your uni? Tell us your university and budget and we\'ll help you find something.</div>';
            }
            if (inputRow) inputRow.style.display = 'none';
            if (status) status.textContent = 'Usually replies within minutes';
            
            adminConnected = false;
        }

        // Exit chat
        function exitChat() {
            if (confirm('End this chat session? Your conversation history will be saved.')) {
                // Mark as closed in localStorage
                try {
                    const saved = localStorage.getItem('chatSession');
                    if (saved) {
                        const session = JSON.parse(saved);
                        session.closed = true;
                        session.closedAt = new Date().toISOString();
                        localStorage.setItem('chatSession', JSON.stringify(session));
                    }
                } catch (e) {
                    console.error('Failed to mark session as closed:', e);
                }
                
                clearChatSession();
                showPreChatForm();
                toggleChat(); // Close popup
            }
        }

        // Initialize chat socket for real-time updates
        function initChatSocket() {
            if (chatSocket) {
                console.log('Socket already initialized');
                return;
            }
            
            console.log('Initializing chat socket...');
            chatSocket = io(window.location.origin, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5
            });
            
            chatSocket.on('connect', () => {
                console.log('🟢 Chat socket connected:', chatSocket.id);
                
                // ALWAYS try to join room when socket connects (handles initial + reconnect)
                if (chatSessionId) {
                    console.log('🟢 Auto-joining chat room on connect:', chatSessionId);
                    chatSocket.emit('join_chat', chatSessionId);
                }
            });
            
            chatSocket.on('reconnect', () => {
                console.log('🟢 Chat socket reconnected');
                if (chatSessionId) {
                    console.log('🟢 Re-joining chat room after reconnect:', chatSessionId);
                    chatSocket.emit('join_chat', chatSessionId);
                }
            });
            
            chatSocket.on('disconnect', (reason) => {
                console.log('🔴 Chat socket disconnected:', reason);
            });
            
            // Receive ack from backend that we joined the room
            chatSocket.on('joined_chat', (data) => {
                console.log('✅ Confirmed joined chat room:', data);
            });
            
            // Listen for all messages (both own and admin replies)
            chatSocket.on('message_received', (data) => {
                console.log('=== MESSAGE RECEIVED ===', data);
                console.log('Session:', data.sessionId, 'Current:', chatSessionId);
                console.log('isAdmin:', data.isAdmin, 'senderType:', data.senderType);
                console.log('Message:', data.message?.substring(0, 50));
                
                const area = document.getElementById('chatMessagesArea');
                if (!area) {
                    console.log('ERROR: chatMessagesArea not found');
                    return;
                }
                // Note: We process messages even if chat area is hidden (will show when user opens chat)
                
                // Create unique message ID for deduplication
                const msgId = data._id || `${data.sessionId}-${data.message?.substring(0, 30)}-${data.createdAt || Date.now()}`;
                if (processedMessageIds.has(msgId)) {
                    console.log('Skipping duplicate message:', msgId);
                    return;
                }
                processedMessageIds.add(msgId);
                
                // Remove typing indicator if present
                const typingIndicator = document.querySelector('.chat-typing-indicator');
                if (typingIndicator) typingIndicator.remove();
                
                const bubble = document.createElement('div');
                
                // Determine style based on senderType
                const senderType = data.senderType || (data.isAdmin ? 'human' : 'visitor');
                console.log('Determined senderType:', senderType);
                
                if (senderType === 'visitor') {
                    // Visitor's own message - already shown optimistically, skip
                    console.log('Skipping visitor message (already shown optimistically)');
                    return;
                } else if (senderType === 'ai') {
                    // AI message - blue/purple, left side (skip if admin connected)
                    if (adminConnected) {
                        console.log('Skipping AI message - admin is connected');
                        return;
                    }
                    bubble.className = 'chat-bubble chat-bubble-ai';
                    bubble.innerHTML = `
                        <div class="sender-label"><i class="fas fa-robot"></i> AI Assistant</div>
                        <div>${escapeHtml(data.message)}</div>
                    `;
                } else {
                    // Human admin - gray, left side
                    console.log('Displaying admin message');
                    bubble.className = 'chat-bubble chat-bubble-human';
                    const adminName = data.name || 'Agent';
                    bubble.innerHTML = `
                        <div class="sender-label"><i class="fas fa-user-headset"></i> ${escapeHtml(adminName)}</div>
                        <div>${escapeHtml(data.message)}</div>
                    `;
                }
                
                area.appendChild(bubble);
                area.scrollTop = area.scrollHeight;
                console.log('=== Message successfully added to chat ===');
            });
            
            // Also listen for admin_reply event (fallback - for direct admin messages)
            chatSocket.on('admin_reply', (data) => {
                console.log('Admin reply received (admin_reply event):', data);
                const area = document.getElementById('chatMessagesArea');
                if (!area || area.style.display === 'none') return;
                
                // Remove typing indicator
                const typingIndicator = document.querySelector('.chat-typing-indicator');
                if (typingIndicator) typingIndicator.remove();
                
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble chat-bubble-human';
                const adminName = data.name || data.adminName || 'Agent';
                bubble.innerHTML = `
                    <div class="sender-label"><i class="fas fa-user-headset"></i> ${escapeHtml(adminName)}</div>
                    <div>${escapeHtml(data.message)}</div>
                `;
                
                area.appendChild(bubble);
                area.scrollTop = area.scrollHeight;
            });
            
            // Admin connected - show banner and disable AI
            chatSocket.on('admin_connected', (data) => {
                console.log('🟢 Admin connected event received:', data);
                adminConnected = true;
                
                const area = document.getElementById('chatMessagesArea');
                if (!area) {
                    console.log('⚠️ chatMessagesArea not found for admin_connected');
                    return;
                }
                
                // Remove any existing AI typing indicators
                const typingIndicator = document.querySelector('.chat-typing-indicator');
                if (typingIndicator) typingIndicator.remove();
                
                // Don't add duplicate banners
                const existingBanner = area.querySelector('.chat-agent-banner-connected');
                if (existingBanner) {
                    console.log('Banner already exists, skipping');
                    return;
                }
                
                // Show admin connected banner
                const banner = document.createElement('div');
                banner.className = 'chat-agent-banner chat-agent-banner-connected';
                const adminName = data.adminName || 'Agent';
                banner.innerHTML = `<i class="fas fa-user-headset"></i> <strong>${escapeHtml(adminName)}</strong> has joined the chat and will assist you. AI is now disabled.`;
                area.appendChild(banner);
                area.scrollTop = area.scrollHeight;
                
                // Update header status
                const statusEl = document.getElementById('chatHeaderStatus');
                if (statusEl) statusEl.textContent = `${adminName} online`;
                
                console.log('✅ Admin connected banner shown');
            });
            
            // Admin disconnected
            chatSocket.on('admin_disconnected', (data) => {
                console.log('🔴 Admin disconnected event received:', data);
                adminConnected = false;
                
                const area = document.getElementById('chatMessagesArea');
                if (!area) {
                    console.log('⚠️ chatMessagesArea not found for admin_disconnected');
                    return;
                }
                
                // Remove the connected banner
                const connectedBanner = area.querySelector('.chat-agent-banner-connected');
                if (connectedBanner) connectedBanner.remove();
                
                const banner = document.createElement('div');
                banner.className = 'chat-agent-banner';
                banner.style.background = 'linear-gradient(135deg, #fee2e2, #fecaca)';
                banner.style.borderColor = '#fca5a5';
                banner.style.color = '#991b1b';
                banner.innerHTML = `<i class="fas fa-info-circle"></i> Agent has left the chat. AI assistant has resumed.`;
                area.appendChild(banner);
                area.scrollTop = area.scrollHeight;
                
                const statusEl = document.getElementById('chatHeaderStatus');
                if (statusEl) statusEl.textContent = chatUserInfo.name || 'Online';
                
                console.log('✅ Admin disconnected banner shown');
            });
            
            // Typing indicator from admin
            chatSocket.on('typing', (data) => {
                if (data.isAdmin && data.sessionId === chatSessionId) {
                    const area = document.getElementById('chatMessagesArea');
                    if (!area || area.style.display === 'none') return;
                    if (!document.querySelector('.chat-typing-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'chat-typing-indicator chat-bubble';
                        indicator.style.cssText = 'background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px 12px 12px 4px;font-style:italic;color:var(--color-text-muted);';
                        indicator.innerHTML = '<i class="fas fa-ellipsis-h" style="animation:pulse 1s infinite;"></i> typing...';
                        area.appendChild(indicator);
                        area.scrollTop = area.scrollHeight;
                    }
                }
            });
            
            chatSocket.on('stop_typing', (data) => {
                if (data.isAdmin) {
                    const indicator = document.querySelector('.chat-typing-indicator');
                    if (indicator) indicator.remove();
                }
            });

            // Queue position update
            chatSocket.on('queue_position', (data) => {
                if (data.sessionId !== chatSessionId) return;
                const area = document.getElementById('chatMessagesArea');
                if (!area) return;
                let qEl = document.getElementById('chatQueueBanner');
                if (!qEl) {
                    qEl = document.createElement('div');
                    qEl.id = 'chatQueueBanner';
                    qEl.style.cssText = 'background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #f59e0b;border-radius:8px;padding:0.6rem 0.9rem;margin:0.5rem;font-size:0.82rem;color:#92400e;text-align:center;';
                    area.insertBefore(qEl, area.firstChild);
                }
                qEl.innerHTML = `<i class="fas fa-clock"></i> ${data.message || `Position ${data.position} in queue`} — ${data.estimatedWait || 'connecting shortly'}`;
            });

            // Agent has been assigned
            chatSocket.on('agent_assigned', (data) => {
                if (data.sessionId && data.sessionId !== chatSessionId) return;
                adminConnected = true;
                const area = document.getElementById('chatMessagesArea');
                if (!area) return;
                // Remove queue banner
                const qEl = document.getElementById('chatQueueBanner');
                if (qEl) qEl.remove();
                // Don't duplicate
                if (area.querySelector('.chat-agent-banner-connected')) return;
                const banner = document.createElement('div');
                banner.className = 'chat-agent-banner chat-agent-banner-connected';
                const agentName = data.agentName || 'Agent';
                banner.innerHTML = `<i class="fas fa-user-headset"></i> <strong>${escapeHtml(agentName)}</strong> has joined and will assist you.`;
                area.appendChild(banner);
                area.scrollTop = area.scrollHeight;
                const statusEl = document.getElementById('chatHeaderStatus');
                if (statusEl) statusEl.textContent = `${agentName} online`;
            });

            // Agent transferred (rotation)
            chatSocket.on('agent_transferred', (data) => {
                if (data.sessionId && data.sessionId !== chatSessionId) return;
                const area = document.getElementById('chatMessagesArea');
                if (!area) return;
                const banner = document.createElement('div');
                banner.className = 'chat-agent-banner';
                banner.style.cssText = 'background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;color:#1e40af;';
                banner.innerHTML = `<i class="fas fa-exchange-alt"></i> You've been connected to <strong>${escapeHtml(data.agentName || 'a new agent')}</strong>.`;
                area.appendChild(banner);
                area.scrollTop = area.scrollHeight;
            });

            // No agents available after max rotations
            chatSocket.on('chat_unavailable', (data) => {
                if (data.sessionId && data.sessionId !== chatSessionId) return;
                const area = document.getElementById('chatMessagesArea');
                if (!area) return;
                const qEl = document.getElementById('chatQueueBanner');
                if (qEl) qEl.remove();
                const banner = document.createElement('div');
                banner.className = 'chat-agent-banner';
                banner.style.cssText = 'background:linear-gradient(135deg,#f9fafb,#f3f4f6);border:1px solid #d1d5db;color:#374151;';
                banner.innerHTML = `<i class="fas fa-moon"></i> ${escapeHtml(data.message || "All agents are busy. Please leave a message and we'll get back to you.")}`;
                area.appendChild(banner);
                area.scrollTop = area.scrollHeight;
            });
            
            chatSocket.on('connect_error', (err) => {
                console.error('Chat socket error:', err.message);
            });
        }

        function toggleChat() {
            chatOpen = !chatOpen;
            const popup = document.getElementById('chatPopup');
            if (popup) popup.classList.toggle('active', chatOpen);
            const icon = document.getElementById('chatIcon');
            if (icon) icon.className = chatOpen ? 'fas fa-times' : 'fas fa-comments';
            
            if (chatOpen) {
                // Initialize socket first
                if (!chatSocket) {
                    initChatSocket();
                }
                
                // Check if we have a saved session
                const hasSession = loadChatSession();
                console.log('Toggle chat - has session:', hasSession, 'sessionId:', chatSessionId);
                
                if (hasSession && chatSessionId) {
                    // Check if session was closed
                    try {
                        const saved = localStorage.getItem('chatSession');
                        if (saved) {
                            const session = JSON.parse(saved);
                            if (session.closed) {
                                // Session was closed, show pre-chat form
                                console.log('Session was previously closed, showing form');
                                showPreChatForm();
                                return;
                            }
                        }
                    } catch (e) {
                        console.error('Error checking session status:', e);
                    }
                    
                    // Show chat interface with saved session
                    showChatInterface();
                    
                    // Ensure we join the socket room (whether socket is already connected or not)
                    if (chatSocket) {
                        if (chatSocket.connected) {
                            console.log('Socket already connected, joining room:', chatSessionId);
                            chatSocket.emit('join_chat', chatSessionId);
                        } else {
                            console.log('Socket not yet connected, will join when connected');
                            // The connect handler will join the room once connected
                            // But also listen for connect to join immediately when it happens
                            chatSocket.once('connect', () => {
                                console.log('Socket now connected, joining room:', chatSessionId);
                                chatSocket.emit('join_chat', chatSessionId);
                            });
                        }
                    }
                    
                    // Load history from server
                    loadChatHistory(chatSessionId);
                } else {
                    // Show pre-chat form
                    showPreChatForm();
                }
            }
        }

        function onTyping() {
            if (chatSocket && chatSocket.connected && chatSessionId) {
                chatSocket.emit('typing', { sessionId: chatSessionId, isAdmin: false });
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    chatSocket.emit('stop_typing', { sessionId: chatSessionId, isAdmin: false });
                }, 2000);
            }
        }

        async function sendChat() {
            const input = document.getElementById('chatInput');
            const msg = input.value.trim();
            if (!msg) return;
            input.value = '';
            clearTimeout(typingTimeout);
            if (chatSocket && chatSocket.connected) {
                chatSocket.emit('stop_typing', { sessionId: chatSessionId, isAdmin: false });
            }

            const area = document.getElementById('chatMessagesArea');
            
            // Show own message optimistically
            const userBubble = document.createElement('div');
            userBubble.className = 'chat-bubble chat-bubble-visitor';
            userBubble.textContent = msg;
            area.appendChild(userBubble);
            area.scrollTop = area.scrollHeight;

            // Send via socket (real-time) or REST as fallback
            if (chatSocket && chatSocket.connected) {
                chatSocket.emit('send_message', {
                    sessionId: chatSessionId,
                    message: msg,
                    name: chatUserInfo.name,
                    email: chatUserInfo.email,
                    phone: chatUserInfo.phone
                });
            } else {
                // Fallback to REST API
                try {
                    await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: chatSessionId,
                            message: msg,
                            name: chatUserInfo.name,
                            email: chatUserInfo.email,
                            phone: chatUserInfo.phone,
                            isAdmin: false
                        })
                    });
                } catch (e) {
                    console.error('Failed to send message:', e);
                }
            }

            area.scrollTop = area.scrollHeight;
        }

        // Load filter options and featured listings on page load
        document.addEventListener('DOMContentLoaded', () => {
            loadFilterOptions();
            loadFeatured();
            initWhatsAppQR();
            initChatScrollTransition();
            initMeshCanvas('heroMeshCanvas', { cols: 20, rows: 14, speed: 0.0004, opacity: 0.08 });
        });

        // ── INLINE CHAT (contact section) — reuses same socket + session ──
        function startInlineChat() {
            const nameInput = document.getElementById('inlineChatName');
            const phoneInput = document.getElementById('inlineChatPhone');
            const emailInput = document.getElementById('inlineChatEmail');
            if (!nameInput.value.trim() || !phoneInput.value.trim()) {
                alert('Please enter your name and phone number.'); return;
            }
            // Mirror values into the floating widget's fields so startChatSession() works
            document.getElementById('chatUserName').value = nameInput.value.trim();
            document.getElementById('chatUserPhone').value = phoneInput.value.trim();
            document.getElementById('chatUserEmail').value = emailInput.value.trim();
            // Kick off the shared session
            startChatSession().then(() => {
                syncInlineChatUI();
            }).catch(() => syncInlineChatUI());
        }

        function syncInlineChatUI() {
            const preForm = document.getElementById('inlineChatPreForm');
            const msgArea = document.getElementById('inlineChatMessagesArea');
            const inputRow = document.getElementById('inlineChatInputRow');
            if (!preForm || !msgArea || !inputRow) return;
            const floatMsgArea = document.getElementById('chatMessagesArea');
            if (floatMsgArea && floatMsgArea.style.display !== 'none') {
                preForm.style.display = 'none';
                msgArea.style.display = 'block';
                inputRow.style.display = 'flex';
                // Mirror messages from floating widget
                msgArea.innerHTML = floatMsgArea.innerHTML;
                msgArea.scrollTop = msgArea.scrollHeight;
            }
        }

        function sendInlineChat() {
            const input = document.getElementById('inlineChatInput');
            const msg = input.value.trim();
            if (!msg) return;
            // Mirror to the floating widget input and trigger sendChat
            document.getElementById('chatInput').value = msg;
            input.value = '';
            sendChat();
            // Sync messages back after a tick
            setTimeout(syncInlineChatUI, 100);
        }

        function onInlineTyping() {
            onTyping();
        }

        function initChatScrollTransition() {
            const contactSection = document.getElementById('contact');
            const chatWidget = document.querySelector('.chat-widget');
            if (!contactSection || !chatWidget) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        chatWidget.classList.add('chat-widget--hidden');
                        // Sync inline UI with current chat state
                        syncInlineChatUI();
                    } else {
                        chatWidget.classList.remove('chat-widget--hidden');
                    }
                });
            }, { threshold: 0.15 });

            observer.observe(contactSection);
        }

        // WhatsApp QR Code - Desktop only
        function initWhatsAppQR() {
            const qrContainer = document.getElementById('whatsappQRDesktop');
            const qrImg = document.getElementById('whatsappQRCode');
            if (!qrContainer || !qrImg) return;
            
            // Only show on desktop (>1024px)
            function checkScreenSize() {
                if (window.innerWidth > 1024) {
                    qrContainer.style.display = 'block';
                    // Generate QR code using QRServer API
                    const whatsappUrl = 'https://wa.me/60184022169?text=Hi%20Ten%26See%2C%20I%27m%20interested%20in%20finding%20a%20room.%20Can%20you%20help%20me%3F';
                    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(whatsappUrl)}`;
                } else {
                    qrContainer.style.display = 'none';
                }
            }
            
            checkScreenSize();
            window.addEventListener('resize', checkScreenSize);
        }

        // Load universities and areas from database
        async function loadFilterOptions() {
            try {
                const res = await fetch('/api/listings/filters/options');
                const data = await res.json();
                const options = data.data;

                // Populate university dropdown
                const uniSelect = document.getElementById('qUni');
                let uniOptions = '<option value="">Select University</option>';
                (options.universities || []).forEach(uni => {
                    if (uni) uniOptions += `<option value="${uni}">${uni}</option>`;
                });
                uniSelect.innerHTML = uniOptions;

                // Store available areas for later use
                window.availableAreas = options.areas || [];
            } catch (e) { console.error(e); }
        }

        // Triangle mesh canvas animation
        function initMeshCanvas(canvasId, options = {}) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            let width, height;
            const cols = options.cols || 18;
            const rows = options.rows || 12;
            const speed = options.speed || 0.0003;
            const points = [];

            function resize() {
                const rect = canvas.getBoundingClientRect();
                width = rect.width; height = rect.height;
                canvas.width = width * dpr; canvas.height = height * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                points.length = 0;
                const xStep = width / (cols - 1);
                const yStep = height / (rows - 1);
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        points.push({
                            baseX: x * xStep,
                            baseY: y * yStep,
                            phase: Math.random() * Math.PI * 2,
                            speed: 0.5 + Math.random() * 0.5
                        });
                    }
                }
            }
            resize();
            window.addEventListener('resize', resize);

            let time = 0;
            function drawTriangle(p1, p2, p3, color, opacity) {
                const cx = (p1.x + p2.x + p3.x) / 3;
                const cy = (p1.y + p2.y + p3.y) / 3;
                const distFromCenter = Math.sqrt(Math.pow(cx - width / 2, 2) + Math.pow(cy - height / 2, 2));
                const maxDist = Math.max(width, height) / 2;
                const fade = 1 - Math.min(distFromCenter / maxDist, 1) * 0.5;
                ctx.fillStyle = `rgba(${color}, ${opacity * fade})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fill();
            }

            function draw() {
                time += 1;
                ctx.clearRect(0, 0, width, height);
                const activePoints = points.map(p => {
                    const dx = Math.sin(time * speed * p.speed + p.phase) * (width * 0.015);
                    const dy = Math.cos(time * speed * p.speed * 0.7 + p.phase) * (height * 0.015);
                    return { x: p.baseX + dx, y: p.baseY + dy };
                });

                const color = options.color || '201, 168, 76';
                const opacity = options.opacity || 0.08;
                for (let y = 0; y < rows - 1; y++) {
                    for (let x = 0; x < cols - 1; x++) {
                        const i = y * cols + x;
                        const p1 = activePoints[i];
                        const p2 = activePoints[i + 1];
                        const p3 = activePoints[i + cols];
                        const p4 = activePoints[i + cols + 1];
                        drawTriangle(p1, p2, p3, color, opacity);
                        drawTriangle(p2, p3, p4, color, opacity * 0.8);
                    }
                }

                ctx.strokeStyle = `rgba(${color}, ${opacity * 0.6})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols - 1; x++) {
                        const i = y * cols + x;
                        const p = activePoints[i];
                        const p2 = activePoints[i + 1];
                        ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
                    }
                }
                for (let y = 0; y < rows - 1; y++) {
                    for (let x = 0; x < cols; x++) {
                        const i = y * cols + x;
                        const p = activePoints[i];
                        const p2 = activePoints[i + cols];
                        ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
                    }
                }
                ctx.stroke();

                requestAnimationFrame(draw);
            }
            draw();
        }

/* ===== block ===== */

// HERO SLIDESHOW SYSTEM
        // Automatically cycles through hero background slides every 6 seconds
        // Configurable: Change slideInterval (ms) to adjust rotation speed
        (function initHeroSlideshow() {
            const slideshow = document.getElementById('heroSlideshow');
            if (!slideshow) return;

            const slides = slideshow.querySelectorAll('.hero-bg-slide');
            if (slides.length <= 1) return;

            let currentSlide = 0;
            const slideInterval = 6000; // 6 seconds per slide

            function nextSlide() {
                slides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add('active');
            }

            // Start slideshow after initial delay
            setInterval(nextSlide, slideInterval);
        })();

/* ===== block ===== */

// Cookie functions
        function setCookie(name, value, days) {
            const expires = new Date(Date.now() + days * 864e5).toUTCString();
            document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; domain=' + window.location.hostname;
        }
        
        function getCookie(name) {
            return document.cookie.split('; ').reduce((r, v) => {
                const parts = v.split('=');
                return parts[0] === name ? decodeURIComponent(parts[1]) : r;
            }, '');
        }
        
        function acceptEssential() {
            setCookie('cookieConsent', 'essential', 365);
            hideBanner();
        }
        
        function acceptAll() {
            setCookie('cookieConsent', 'all', 365);
            hideBanner();
        }
        
        function hideBanner() {
            document.getElementById('cookieBanner').style.transform = 'translateY(100%)';
        }
        
        // Show banner if no consent
        if (!getCookie('cookieConsent')) {
            setTimeout(() => {
                document.getElementById('cookieBanner').style.transform = 'translateY(0)';
            }, 1000);
        }
