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
var togglePasswordBtn = document.getElementById('togglePassword') as HTMLButtonElement;
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword') as HTMLButtonElement;
var passwordInput = document.getElementById('password') as HTMLInputElement;
const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;

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

// Toggle confirm password visibility
toggleConfirmPasswordBtn.addEventListener('click', () => {
	const eyeOpen = toggleConfirmPasswordBtn.querySelector('.eye-open') as SVGPathElement;
	const eyeClosed = toggleConfirmPasswordBtn.querySelector('.eye-closed') as SVGPathElement;
	
	if (confirmPasswordInput.type === 'password') {
		confirmPasswordInput.type = 'text';
		eyeClosed.style.display = 'none';
		eyeOpen.style.display = 'block';
	} else {
		confirmPasswordInput.type = 'password';
		eyeClosed.style.display = 'block';
		eyeOpen.style.display = 'none';
	}
});

registerForm.addEventListener('submit', async (e: Event) => {
	e.preventDefault();
	
	const usernameInput = document.getElementById('username') as HTMLInputElement;
	const emailInput = document.getElementById('email') as HTMLInputElement;
	
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
