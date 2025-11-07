interface User {
	id: number;
	username: string;
	email: string;
	walletAddress?: string;
}

interface RegisterResponse {
	success: boolean;
	message?: string;
	user?: User;
}

function switchToLogin(): void {
	window.parent.postMessage({
		type: 'SWITCH_TO_LOGIN'
	}, '*');
}

const registerForm = document.getElementById('registerForm') as HTMLFormElement;
const registerErrorDiv = document.getElementById('error') as HTMLDivElement;
const registerSuccessDiv = document.getElementById('success') as HTMLDivElement;
const googleSignUpBtn = document.getElementById('googleSignUpBtn') as HTMLButtonElement;

// Google Sign Up button handler
googleSignUpBtn.addEventListener('click', () => {
	const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth`;

	const options =
	{
		redirect_uri: "http://localhost:3065/client.html",
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

	const ans = `${googleAuthUrl}?${qs.toString()}`;

	window.top!.location.href = ans;
});


function getCookie(name: string): string | undefined {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop()?.split(';').shift();
}

registerForm.addEventListener('submit', async (e: Event) => {
	e.preventDefault();
	
	const usernameInput = document.getElementById('username') as HTMLInputElement;
	const emailInput = document.getElementById('email') as HTMLInputElement;
	const passwordInput = document.getElementById('password') as HTMLInputElement;
	const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
	
	const username = usernameInput.value.trim();
	const email = emailInput.value.trim();
	const password = passwordInput.value.trim();
	const confirmPassword = confirmPasswordInput.value.trim();

	registerErrorDiv.textContent = '';
	registerSuccessDiv.textContent = '';

	// Validate passwords match
	if (password !== confirmPassword) {
		registerErrorDiv.textContent = 'Passwords do not match';
		return;
	}

	// Validate password requirements
	if (password.length < 8) {
		registerErrorDiv.textContent = 'Password must be at least 8 characters long';
		return;
	}
	
	// Check password complexity
	const hasLowercase = /[a-z]/.test(password);
	const hasUppercase = /[A-Z]/.test(password);
	const hasDigit = /[0-9]/.test(password);
	const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
	
	if (!hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
		registerErrorDiv.textContent = 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character';
		return;
	}

	try {
		const res = await fetch('http://localhost:4000/api/users/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ email, username, password, confirmPassword })
		});

		const data: RegisterResponse = await res.json();

		if (res.ok && data.success) {
			registerSuccessDiv.textContent = 'Registration successful! Logging you in...';
			
			setTimeout(() => {
				const sessionId = getCookie('sessionId');
				
				window.parent.postMessage({
					type: 'LOGIN_SUCCESS',
					sessionId: sessionId,
					user: data.user
				}, '*');
			}, 100);

		} else {
			registerErrorDiv.textContent = data.message || 'Registration failed';
		}
	} catch (error) {
		console.error('Registration error:', error);
		registerErrorDiv.textContent = 'Network error. Please try again.';
	}
});
