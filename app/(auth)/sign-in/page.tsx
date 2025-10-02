'use client'
import {useForm} from "react-hook-form";
import InputField from "@/components/forms/inputfield";
import {Button} from "@/components/ui/button";
import FooterLink from "@/components/forms/FooterLink";
import {signInWithEmail} from "@/lib/actions/auth.actions";
import {toast} from "sonner";
import {useRouter} from "next/navigation";

const SignIn = () => {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues:{
            email:'',
            password:''
        },
        mode: 'onBlur'
    })

    const onSubmit = async (data: SignInFormData) => {
        try {
            const result =await signInWithEmail(data)
            if (result.success) router.push("/")
        }catch(error) {
            console.log(error)
            toast.error('Sign In failed',{
                description: error instanceof Error ? error.message : "Failed to Sign In",
            })
        }
    }
    return (
        <>
            <h1 className="form-title">Log in Your Account</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
                <InputField
                    name="email"
                    label="Email"
                    type="text"
                    placeholder="Enter email"
                    register={register}
                    error={errors.email}
                    validation={{required:'Email is required', pattern:/^\w+@\w+\.\w+$/, message:'Invalid email address' }}
                />
                <InputField
                    name="password"
                    label="Password"
                    type="password"
                    placeholder="Enter password"
                    register={register}
                    error={errors.password}
                    validation={{required:'Password is required', minLength:8}}
                />
                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? "Signing In" : "Sign In"}
                </Button>
                <FooterLink text={`Do not have an Account?`} linkText={`Create an Account`} href={`/sign-up`}/>
            </form>
        </>
    )
}
export default SignIn
