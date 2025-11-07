interface User {
	id: number;
	username: string;
	email: string;
	walletAddress?: string;
}

interface LoginResponse {
	success: boolean;
	message?: string;
	user?: User;
}

const form = document.getElementById('loginForm') as HTMLFormElement;
const errorDiv = document.getElementById('error') as HTMLDivElement;
const successDiv = document.getElementById('success') as HTMLDivElement;

form.addEventListener('submit', async (e: Event) => {
	e.preventDefault();
	
	const emailInput = document.getElementById('email') as HTMLInputElement;
	const passwordInput = document.getElementById('password') as HTMLInputElement;
	
	const email = emailInput.value.trim();
	const password = passwordInput.value.trim();

	errorDiv.textContent = '';
	successDiv.textContent = '';

	try {
		const res = await fetch('http://localhost:4000/api/users/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ email, password })
		});

		const data: LoginResponse = await res.json();

		if (res.ok) {
			setTimeout(() => {
				window.parent.postMessage({
					type: 'LOGIN_SUCCESS',
					user: data.user
				}, '*');
			}, 100);

		} else {
			errorDiv.textContent = data.message || 'Login failed';
		}
	} catch (error) {
		console.error('Login error:', error);
		errorDiv.textContent = 'Network error. Please try again.';
	}
});
