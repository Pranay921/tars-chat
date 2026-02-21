import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 mb-4 shadow-lg shadow-purple-500/30">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Join Tars Chat</h1>
                    <p className="text-purple-200/60 mt-1 text-sm">Create your account to get started</p>
                </div>
                <SignUp
                    appearance={{
                        elements: {
                            rootBox: "w-full",
                            card: "bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md rounded-2xl",
                            headerTitle: "text-white",
                            headerSubtitle: "text-purple-200/60",
                            socialButtonsBlockButton: "bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors",
                            formFieldInput: "bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-purple-500",
                            formFieldLabel: "text-purple-200/80",
                            formButtonPrimary: "bg-purple-600 hover:bg-purple-700 text-white transition-colors",
                            footerActionLink: "text-purple-400 hover:text-purple-300",
                            dividerText: "text-white/30",
                            dividerLine: "bg-white/10",
                        },
                    }}
                />
            </div>
        </div>
    );
}
