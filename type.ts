export interface SignupFormData {
    email: string;
    password: string;
}

export interface SignupFormProps {
    onSubmit: (formData: SignupFormData) => void
    loading?: boolean
    error?: string | null
    success?: boolean
}