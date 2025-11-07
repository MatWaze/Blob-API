interface User {
	id: number;
	username: string;
	email: string;
	walletAddress?: string;
}

interface MessageData {
	type: string;
	sessionId?: string;
	user?: User;
	message?: string;
}

interface Transaction {
	id: number;
	userId: number;
	type: string;
	amount: number;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface Game {
	id: number;
	createdAt: string;
	players: Array<{ userId: number; username: string; place: number; score: number }>;
}

type WindowType = 'login' | 'register' | 'game' | 'profile';

class TranscendenceClient {
	private currentSessionId: string | null = null;
	private currentUser: User | null = null;
	private isAuthenticated: boolean = false;
	private activeWindows: Set<WindowType> = new Set();
	private focusedWindow: WindowType | null = null;
	private minimizedWindows: Set<WindowType> = new Set();
	
	// Elements
	private welcomeScreen: HTMLElement;
	private loginWindow: HTMLElement;
	private registerWindow: HTMLElement;
	private gameWindow: HTMLElement;
	private profileWindow: HTMLElement;
	private loginFrame: HTMLIFrameElement;
	private registerFrame: HTMLIFrameElement;
	private gameFrame: HTMLIFrameElement;
	private loading: HTMLElement;
	
	// Buttons
	private loginBtn: HTMLButtonElement;
	private registerBtn: HTMLButtonElement;
	private gameBtn: HTMLButtonElement;
	private profileBtn: HTMLButtonElement;
	private logoutBtn: HTMLButtonElement;
	private welcomeLoginBtn: HTMLButtonElement;
	private welcomeRegisterBtn: HTMLButtonElement;
	private welcomeGameBtn: HTMLButtonElement;
	private welcomeProfileBtn: HTMLButtonElement;
	
	// Taskbar items
	private loginTaskbar: HTMLElement;
	private registerTaskbar: HTMLElement;
	private gameTaskbar: HTMLElement;
	private profileTaskbar: HTMLElement;
	
	// Status elements
	private authIndicator: HTMLElement;
	private authStatus: HTMLElement;
	private connectionIndicator: HTMLElement;
	private connectionStatus: HTMLElement;
	private userInfo: HTMLElement;

	constructor() {
		// Elements
		this.welcomeScreen = document.getElementById('welcomeScreen')!;
		this.loginWindow = document.getElementById('loginWindow')!;
		this.registerWindow = document.getElementById('registerWindow')!;
		this.gameWindow = document.getElementById('gameWindow')!;
		this.profileWindow = document.getElementById('profileWindow')!;
		this.loginFrame = document.getElementById('loginFrame') as HTMLIFrameElement;
		this.registerFrame = document.getElementById('registerFrame') as HTMLIFrameElement;
		this.gameFrame = document.getElementById('gameFrame') as HTMLIFrameElement;
		this.loading = document.getElementById('loading')!;
		
		// Buttons
		this.loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
		this.registerBtn = document.getElementById('registerBtn') as HTMLButtonElement;
		this.gameBtn = document.getElementById('gameBtn') as HTMLButtonElement;
		this.profileBtn = document.getElementById('profileBtn') as HTMLButtonElement;
		this.logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
		this.welcomeLoginBtn = document.getElementById('welcomeLoginBtn') as HTMLButtonElement;
		this.welcomeRegisterBtn = document.getElementById('welcomeRegisterBtn') as HTMLButtonElement;
		this.welcomeGameBtn = document.getElementById('welcomeGameBtn') as HTMLButtonElement;
		this.welcomeProfileBtn = document.getElementById('welcomeProfileBtn') as HTMLButtonElement;
		
		// Taskbar items
		this.loginTaskbar = document.getElementById('loginTaskbar')!;
		this.registerTaskbar = document.getElementById('registerTaskbar')!;
		this.gameTaskbar = document.getElementById('gameTaskbar')!;
		this.profileTaskbar = document.getElementById('profileTaskbar')!;
		
		// Status elements
		this.authIndicator = document.getElementById('authIndicator')!;
		this.authStatus = document.getElementById('authStatus')!;
		this.connectionIndicator = document.getElementById('connectionIndicator')!;
		this.connectionStatus = document.getElementById('connectionStatus')!;
		this.userInfo = document.getElementById('userInfo')!;

		this.setupEventListeners();
		this.setupMessageListener();
		this.checkExistingSession();
	}

	private setupEventListeners(): void {
		// Navigation buttons
		this.loginBtn.onclick = () => this.showWindow('login');
		this.registerBtn.onclick = () => this.showWindow('register');
		this.gameBtn.onclick = () => this.showWindow('game');
		this.profileBtn.onclick = () => this.showWindow('profile');
		this.logoutBtn.onclick = () => this.handleLogout();
		
		// Welcome buttons
		this.welcomeLoginBtn.onclick = () => this.showWindow('login');
		this.welcomeRegisterBtn.onclick = () => this.showWindow('register');
		this.welcomeGameBtn.onclick = () => this.showWindow('game');
		this.welcomeProfileBtn.onclick = () => this.showWindow('profile');
		
		// Profile update button
		const updateWalletBtn = document.getElementById('updateWalletBtn');
		if (updateWalletBtn) {
			updateWalletBtn.onclick = () => this.updateWalletAddress();
		}
		
		// Window click handlers for focus
		this.loginWindow.addEventListener('mousedown', () => {
			if (this.activeWindows.has('login')) {
				this.focusWindow('login');
			}
		});
		
		this.registerWindow.addEventListener('mousedown', () => {
			if (this.activeWindows.has('register')) {
				this.focusWindow('register');
			}
		});
		
		this.gameWindow.addEventListener('mousedown', () => {
			if (this.activeWindows.has('game')) {
				this.focusWindow('game');
			}
		});
		
		this.profileWindow.addEventListener('mousedown', () => {
			if (this.activeWindows.has('profile')) {
				this.focusWindow('profile');
			}
		});
	}

	private setupMessageListener(): void {
		window.addEventListener('message', (event: MessageEvent<MessageData>) => {
			switch (event.data.type) {
				case 'LOGIN_SUCCESS':
					this.handleLoginSuccess(event.data);
					break;
				
				case 'SWITCH_TO_LOGIN':
					this.hideWindow('register');
					this.showWindow('login');
					break;
				
				case 'LOGOUT':
					this.handleLogout();
					break;

				case 'REQUEST_SESSION':
				case 'AUTH_FAILED':
					this.handleAuthFailed();
					break;
				
				case 'GAME_READY':
					this.updateConnectionStatus('Connected to Game', true);
					break;

				case 'BABYLON_READY':
					this.updateConnectionStatus('Babylon.js Scene Loaded', true);
					break;
					
				case 'BABYLON_ERROR':
					this.updateConnectionStatus('Babylon.js Error', false);
					break;

				case 'UPDATE_STATUS':
					const isSuccess = (event.data as any).status === 'success';
					this.updateConnectionStatus(event.data.message || '', isSuccess);
					break;
			}
		});
	}

	private async checkExistingSession(): Promise<void> {
		try {
			const response = await fetch('http://localhost:4000/api/users/tokens', {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					this.handleLoginSuccess({
						type: 'LOGIN_SUCCESS',
						user: data.user
					});
				} else {
					this.disableGameAccess();
				}
			} else {
				this.disableGameAccess();
			}
		} catch (error) {
			console.error('Session check failed:', error);
			this.disableGameAccess();
		}
	}

	public showWindow(windowType: WindowType): void {
		console.log(`Showing ${windowType} window`);
		
		this.welcomeScreen.style.display = 'none';
		
		if (this.activeWindows.has(windowType)) {
			this.focusWindow(windowType);
			return;
		}
		
		if (this.minimizedWindows.has(windowType)) {
			this.restoreWindow(windowType);
			return;
		}
		
		this.minimizedWindows.delete(windowType);
		
		const windowElement = this.getWindowElement(windowType);
		if (!windowElement) return;
		
		windowElement.classList.remove('minimized', 'minimizing', 'restoring');
		windowElement.classList.add('active');
		
		const btnElement = this.getButtonElement(windowType);
		const taskbarElement = this.getTaskbarElement(windowType);
		
		if (btnElement) btnElement.classList.add('active');
		if (taskbarElement) taskbarElement.classList.remove('visible');
		
		// Load iframe if needed
		if (windowType === 'login') {
			const frame = windowElement.querySelector('iframe') as HTMLIFrameElement;
			if (!frame.src || frame.src === window.location.href) {
				frame.src = 'login.html';
			}
		} else if (windowType === 'register') {
			const frame = windowElement.querySelector('iframe') as HTMLIFrameElement;
			if (!frame.src || frame.src === window.location.href) {
				frame.src = 'register.html';
			}
		} else if (windowType === 'game') {
			if (!this.isAuthenticated) {
				this.updateAuthStatus('Please login first', false);
				this.showWindow('login');
				return;
			}
			const frame = windowElement.querySelector('iframe') as HTMLIFrameElement;
			if (!frame.src || frame.src === window.location.href) {
				frame.src = 'http://localhost:3000';
			}
		} else if (windowType === 'profile') {
			if (!this.isAuthenticated) {
				alert('Please login first to view your profile');
				return;
			}
			this.updateProfileWindow();
		}
		
		this.activeWindows.add(windowType);
		this.focusWindow(windowType);
		this.arrangeWindows();
	}

	private focusWindow(windowType: WindowType): void {
		console.log(`Focusing ${windowType} window`);
		
		if (!this.activeWindows.has(windowType)) {
			console.log(`Cannot focus ${windowType} - not in active windows`);
			return;
		}
		
		// Remove focus from all windows
		[this.loginWindow, this.registerWindow, this.gameWindow, this.profileWindow].forEach(win => {
			win.classList.remove('focused');
		});
		
		// Add unfocused class to all active windows
		this.activeWindows.forEach(type => {
			const win = this.getWindowElement(type);
			if (win) win.classList.add('unfocused');
		});
		
		// Focus the selected window
		const windowElement = this.getWindowElement(windowType);
		if (windowElement) {
			windowElement.classList.add('focused');
			windowElement.classList.remove('unfocused');
			this.focusedWindow = windowType;
		}
	}

	private arrangeWindows(): void {
		const activeCount = this.activeWindows.size;
		const activeWindowsArray = Array.from(this.activeWindows);
		
		const allGridClasses = ['grid-1', 'grid-2-1', 'grid-2-2', 'grid-3-1', 'grid-3-2', 'grid-3-3', 'grid-4-1', 'grid-4-2', 'grid-4-3', 'grid-4-4'];
		[this.loginWindow, this.registerWindow, this.gameWindow, this.profileWindow].forEach(win => {
			win.classList.remove(...allGridClasses);
		});
		
		if (activeCount === 0) {
			this.showWelcomeScreen();
		} else if (activeCount === 1) {
			this.getWindowElement(activeWindowsArray[0])?.classList.add('grid-1');
		} else if (activeCount === 2) {
			this.getWindowElement(activeWindowsArray[0])?.classList.add('grid-2-1');
			this.getWindowElement(activeWindowsArray[1])?.classList.add('grid-2-2');
		} else if (activeCount === 3) {
			this.getWindowElement(activeWindowsArray[0])?.classList.add('grid-3-1');
			this.getWindowElement(activeWindowsArray[1])?.classList.add('grid-3-2');
			this.getWindowElement(activeWindowsArray[2])?.classList.add('grid-3-3');
		} else if (activeCount >= 4) {
			const gridPositions = ['grid-4-1', 'grid-4-2', 'grid-4-3', 'grid-4-4'];
			for (let i = 0; i < Math.min(4, activeCount); i++) {
				this.getWindowElement(activeWindowsArray[i])?.classList.add(gridPositions[i]);
			}
		}
	}

	private getWindowElement(windowType: WindowType): HTMLElement | null {
		switch (windowType) {
			case 'login': return this.loginWindow;
			case 'register': return this.registerWindow;
			case 'game': return this.gameWindow;
			case 'profile': return this.profileWindow;
			default: return null;
		}
	}

	private getButtonElement(windowType: WindowType): HTMLButtonElement | null {
		switch (windowType) {
			case 'login': return this.loginBtn;
			case 'register': return this.registerBtn;
			case 'game': return this.gameBtn;
			case 'profile': return this.profileBtn;
			default: return null;
		}
	}

	private getTaskbarElement(windowType: WindowType): HTMLElement | null {
		switch (windowType) {
			case 'login': return this.loginTaskbar;
			case 'register': return this.registerTaskbar;
			case 'game': return this.gameTaskbar;
			case 'profile': return this.profileTaskbar;
			default: return null;
		}
	}

	public hideWindow(windowType: WindowType): void {
		console.log(`Hiding ${windowType} window`);
		
		const windowElement = this.getWindowElement(windowType);
		if (!windowElement) return;
		
		windowElement.classList.remove('active', 'minimized', 'minimizing', 'restoring', 'focused', 'unfocused', 'left-half', 'right-half');
		
		const btnElement = this.getButtonElement(windowType);
		const taskbarElement = this.getTaskbarElement(windowType);
		
		if (btnElement) btnElement.classList.remove('active');
		if (taskbarElement) taskbarElement.classList.remove('visible', 'active');
		
		this.minimizedWindows.delete(windowType);
		this.activeWindows.delete(windowType);
		
		if (this.focusedWindow === windowType) {
			const remainingWindows = Array.from(this.activeWindows);
			if (remainingWindows.length > 0) {
				this.focusWindow(remainingWindows[0]);
			} else {
				this.focusedWindow = null;
			}
		}
		
		this.arrangeWindows();
		
		if (this.activeWindows.size === 0 && this.minimizedWindows.size === 0) {
			setTimeout(() => {
				this.showWelcomeScreen();
			}, 300);
		}
	}

	public minimizeWindow(windowType: WindowType): void {
		console.log(`Minimizing ${windowType} window`);
		
		const windowElement = this.getWindowElement(windowType);
		if (!windowElement) return;
		
		windowElement.classList.add('minimizing');
		
		const btnElement = this.getButtonElement(windowType);
		if (btnElement) btnElement.classList.remove('active');
		
		setTimeout(() => {
			windowElement.classList.remove('active', 'minimizing', 'focused', 'unfocused', 'left-half', 'right-half');
			windowElement.classList.add('minimized');
			
			const taskbarElement = this.getTaskbarElement(windowType);
			if (taskbarElement) taskbarElement.classList.add('visible');
			
			this.activeWindows.delete(windowType);
			this.minimizedWindows.add(windowType);
			
			if (this.focusedWindow === windowType) {
				const remainingWindows = Array.from(this.activeWindows);
				if (remainingWindows.length > 0) {
					this.focusWindow(remainingWindows[remainingWindows.length - 1]);
				} else {
					this.focusedWindow = null;
				}
			}
			
			this.arrangeWindows();
		}, 300);
	}

	public restoreWindow(windowType: WindowType): void {
		console.log(`Restoring ${windowType} window`);
		
		this.welcomeScreen.style.display = 'none';
		
		if ((windowType === 'game' || windowType === 'profile') && !this.isAuthenticated) {
			this.updateAuthStatus('Please login first', false);
			if (this.minimizedWindows.has('login')) {
				this.restoreWindow('login');
			} else {
				this.showWindow('login');
			}
			return;
		}
		
		const windowElement = this.getWindowElement(windowType);
		if (!windowElement) return;
		
		windowElement.classList.remove('minimized');
		windowElement.classList.add('restoring', 'active');
		
		const taskbarElement = this.getTaskbarElement(windowType);
		const btnElement = this.getButtonElement(windowType);
		
		if (taskbarElement) taskbarElement.classList.remove('visible');
		if (btnElement) btnElement.classList.add('active');
		
		if (windowType === 'profile') {
			this.updateProfileWindow();
		}
		
		this.minimizedWindows.delete(windowType);
		this.activeWindows.add(windowType);
		
		setTimeout(() => {
			windowElement.classList.remove('restoring');
			this.focusWindow(windowType);
			this.arrangeWindows();
		}, 300);
	}

	private showWelcomeScreen(): void {
		if (this.activeWindows.size === 0 && this.minimizedWindows.size === 0) {
			this.welcomeScreen.style.display = 'flex';
			this.focusedWindow = null;
			
			this.welcomeGameBtn.disabled = !this.isAuthenticated;
			this.welcomeProfileBtn.disabled = !this.isAuthenticated;
		}
	}

	public switchProfileTab(tabName: string): void {
		console.log(`Switching to profile tab: ${tabName}`);
		
		const tabs = document.querySelectorAll('.profile-tab');
		const sections = document.querySelectorAll('.profile-section');
		
		tabs.forEach(tab => tab.classList.remove('active'));
		sections.forEach(section => section.classList.remove('active'));
		
		const activeTab = document.querySelector(`[onclick="client.switchProfileTab('${tabName}')"]`);
		// Capitalize first letter for section ID: info -> Info, transactions -> Transactions
		const sectionId = `profileSection${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
		const activeSection = document.getElementById(sectionId);
		
		console.log('Looking for section:', sectionId);
		console.log('Found section:', activeSection);
		
		if (activeTab) activeTab.classList.add('active');
		if (activeSection) {
			activeSection.classList.add('active');
			console.log('Section is now active');
		}
		
		if (tabName === 'transactions') {
			this.loadTransactions();
		} else if (tabName === 'games') {
			this.loadRecentGames();
		}
	}

	private updateProfileWindow(): void {
		if (this.currentUser) {
			const usernameEl = document.getElementById('profileUsername');
			const emailEl = document.getElementById('profileEmail');
			const walletInput = document.getElementById('profileWalletInput') as HTMLInputElement;
			
			if (usernameEl) usernameEl.textContent = this.currentUser.username;
			if (emailEl) emailEl.textContent = this.currentUser.email;
			if (walletInput) walletInput.value = this.currentUser.walletAddress || '';
		}
	}

	private async loadTransactions(): Promise<void> {
		const container = document.getElementById('transactionsContainer');
		if (!container) return;
		
		container.innerHTML = '<div class="loading-state"><div class="loading-spinner-small"></div><p>Loading transactions...</p></div>';
		
		try {
			const response = await fetch('http://localhost:4000/api/transactions', {
				method: 'GET',
				credentials: 'include'
			});
			
			if (response.ok) {
				const data = await response.json();
				const transactions = data.transactions || [];
				
				if (transactions.length === 0) {
					container.innerHTML = '<div class="empty-state">No transactions found</div>';
					return;
				}
				
				let html = '<div class="transaction-list">';
				transactions.forEach((tx: any) => {
					const statusClass = tx.status === 'completed' ? 'status-completed' : 
									  tx.status === 'pending' ? 'status-pending' : 'status-failed';
					const date = new Date(tx.createdAt).toLocaleString();
					
					html += `
						<div class="transaction-item">
							<div class="transaction-header">
								<span>${tx.type || 'Transaction'}</span>
								<span class="transaction-status ${statusClass}">${tx.status || 'unknown'}</span>
							</div>
							<div class="transaction-details">
								<div>Amount: ${tx.amount || 0} tokens</div>
								<div>Date: ${date}</div>
								${tx.transactionHash ? `<div>Hash: ${tx.transactionHash.slice(0, 20)}...</div>` : ''}
							</div>
						</div>
					`;
				});
				html += '</div>';
				
				container.innerHTML = html;
			} else {
				container.innerHTML = '<div class="empty-state">Failed to load transactions</div>';
			}
		} catch (error) {
			console.error('Failed to load transactions:', error);
			container.innerHTML = '<div class="empty-state">Failed to load transactions</div>';
		}
	}

	private async loadRecentGames(): Promise<void> {
		const container = document.getElementById('gamesContainer');
		if (!container) return;
		
		container.innerHTML = '<div class="loading-state"><div class="loading-spinner-small"></div><p>Loading games...</p></div>';
		
		try {
			const response = await fetch('http://localhost:4000/api/tournaments', {
				method: 'GET',
				credentials: 'include'
			});
			
			if (response.ok) {
				const data = await response.json();
				console.log('Games data received:', data);
				const games = data.tournaments || [];
				console.log('Games array:', games);
				
				if (games.length === 0) {
					container.innerHTML = '<div class="empty-state">No games played in the last week</div>';
					return;
				}
				
				let html = '<div class="game-list">';
				games.forEach((game: any) => {
					console.log('Processing game:', game);
					const date = new Date(game.createdAt).toLocaleString();
					
					html += `
						<div class="game-item">
							<div class="game-header">
								<span>${game.gameName || game.name || `Game #${game.id}`}</span>
							</div>
							<div class="game-details">
								<div>Placement: ${game.placementName || game.placement || 'N/A'}</div>
								<div>Date: ${date}</div>
							</div>
						</div>
					`;
				});
				html += '</div>';
				
				console.log('Final HTML:', html);
				container.innerHTML = html;
			} else {
				console.error('Failed to load games, status:', response.status);
				container.innerHTML = '<div class="empty-state">Failed to load games</div>';
			}
		} catch (error) {
			console.error('Failed to load games:', error);
			container.innerHTML = '<div class="empty-state">Failed to load recent games</div>';
		}
	}

	private async updateWalletAddress(): Promise<void> {
		const walletInput = document.getElementById('profileWalletInput') as HTMLInputElement;
		if (!walletInput) return;
		
		const newAddress = walletInput.value.trim();
		
		try {
			const response = await fetch('http://localhost:4000/api/users/wallet', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ walletAddress: newAddress })
			});
			
			if (response.ok) {
				const data = await response.json();
				if (this.currentUser) {
					this.currentUser.walletAddress = newAddress;
				}
				alert('Wallet address updated successfully!');
			} else {
				const error = await response.json();
				alert(`Failed to update wallet: ${error.message || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Failed to update wallet:', error);
			alert('Network error. Please try again.');
		}
	}

	private handleLoginSuccess(data: MessageData): void {
		console.log('Login successful:', data);
		this.currentUser = data.user || null;
		this.isAuthenticated = true;
		
		this.enableGameAccess();
		this.updateUserInfo(this.currentUser);
		this.hideWindow('login');
		this.hideWindow('register');
	}

	public async handleLogout(): Promise<void> {
		try {
			await fetch('http://localhost:4000/api/users/logout', {
				method: 'POST',
				credentials: 'include'
			});
		} catch (error) {
			console.error('Logout error:', error);
		}
		
		this.currentUser = null;
		this.currentSessionId = null;
		this.isAuthenticated = false;
		
		this.hideWindow('game');
		this.hideWindow('profile');
		
		this.disableGameAccess();
		this.updateUserInfo(null);
		
		if (this.activeWindows.size === 0 && this.minimizedWindows.size === 0) {
			this.showWelcomeScreen();
		}
	}

	private handleAuthFailed(): void {
		this.disableGameAccess();
		this.updateAuthStatus('Authentication failed', false);
	}

	private sendSessionToFrame(targetFrame: Window): void {
		if (this.currentSessionId) {
			targetFrame.postMessage({
				type: 'SESSION_ID',
				sessionId: this.currentSessionId
			}, '*');
		}
	}

	private enableGameAccess(): void {
		this.gameBtn.disabled = false;
		this.profileBtn.disabled = false;
		this.welcomeGameBtn.disabled = false;
		this.welcomeProfileBtn.disabled = false;
		this.loginBtn.style.display = 'none';
		this.registerBtn.style.display = 'none';
		this.welcomeLoginBtn.style.display = 'none';
		this.welcomeRegisterBtn.style.display = 'none';
		this.logoutBtn.style.display = 'block';
		this.updateAuthStatus('Authenticated', true);
	}

	private disableGameAccess(): void {
		this.gameBtn.disabled = true;
		this.profileBtn.disabled = true;
		this.welcomeGameBtn.disabled = true;
		this.welcomeProfileBtn.disabled = true;
		this.loginBtn.style.display = 'block';
		this.registerBtn.style.display = 'block';
		this.welcomeLoginBtn.style.display = 'block';
		this.welcomeRegisterBtn.style.display = 'block';
		this.logoutBtn.style.display = 'none';
		this.updateAuthStatus('Not Authenticated', false);
	}

	private updateAuthStatus(message: string, isConnected: boolean): void {
		this.authStatus.textContent = message;
		this.authIndicator.classList.toggle('connected', isConnected);
	}

	private updateConnectionStatus(message: string, isConnected: boolean): void {
		this.connectionStatus.textContent = message;
		this.connectionIndicator.classList.toggle('connected', isConnected);
	}

	private updateUserInfo(user: User | null): void {
		if (user) {
			this.userInfo.textContent = `User: ${user.username}`;
		} else {
			this.userInfo.textContent = '';
		}
	}

	private showLoading(message: string = 'Loading...'): void {
		const loadingMessage = document.getElementById('loadingMessage');
		if (loadingMessage) loadingMessage.textContent = message;
		this.loading.classList.remove('hidden');
	}

	private hideLoading(): void {
		this.loading.classList.add('hidden');
	}
}

// Declare global client variable
declare global {
	interface Window {
		client: TranscendenceClient;
	}
}

// Initialize the client and expose it globally
window.addEventListener('load', () => {
	(window as any).client = new TranscendenceClient();
});

// Export to make this a module
export {};
