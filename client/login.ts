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
const googleSignInBtn = document.getElementById('googleSignInBtn') as HTMLButtonElement;
var togglePasswordBtn = document.getElementById('togglePassword') as HTMLButtonElement;
var passwordInput = document.getElementById('password') as HTMLInputElement;

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
	const eyeOpen = togglePasswordBtn.querySelector('.eye-open') as SVGPathElement;
	const eyeClosed = togglePasswordBtn.querySelector('.eye-closed') as SVGPathElement;
	
	if (passwordInput.type === 'password') {
		passwordInput.type = 'text';
		eyeOpen.style.display = 'block';
		eyeClosed.style.display = 'none';
	} else {
		passwordInput.type = 'password';
		eyeOpen.style.display = 'none';
		eyeClosed.style.display = 'block';
	}
});

// Google Sign In button handler
googleSignInBtn.addEventListener('click', () => {
	const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth`;

	const options =
	{
		redirect_uri: "http://localhost:4000/api/users/oauth/google",
		client_id: "924313211927-mq9a80c5307kd925bcq85eqc6furl0n1.apps.googleusercontent.com",
		access_type: "offline",
		response_type: "code",
		prompt: "consent",
		scope:
		[
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
		].join(" "),
	};

	const qs = new URLSearchParams(options);

	// Redirect the parent window (not the iframe)
	window.top!.location.href = `${googleAuthUrl}?${qs.toString()}`;
});

function getCookie(name: string): string | undefined {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop()?.split(';').shift();
}

form.addEventListener('submit', async (e: Event) => {
	e.preventDefault();
	
	const emailInput = document.getElementById('email') as HTMLInputElement;
	
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

		const data = await res.json();

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
