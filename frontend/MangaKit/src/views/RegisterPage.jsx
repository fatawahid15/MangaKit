import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; 
import { GoogleLogin } from "@react-oauth/google";

export default function RegisterPage({url}) {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
  
    async function handleRegister(e) {
      e.preventDefault();
      try {
    await axios.post(`${url}/user/register`, {
          email,
          password,
        });
  
        navigate("/login");
        toast.success("Register Success");
      } catch (error) {
        console.error(error);
        toast.error("Register Failed"); 
      }
    }
  
    async function googleLogin(response) {
      try {
        const { data } = await axios.post(
          `${url}/user/google-login`,
          null,
          {
            headers: {
              token: response.credential,
            },
          }
        );
  
        localStorage.setItem("access_token", data.access_token);
        navigate("/");
      } catch (error) {
        console.error(error);
        toast.error("Google Login Failed"); 
      }
    }
    return (
        <>
           <div className="flex items-center justify-center min-h-screen">
  <form
    className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg"
    onSubmit={handleRegister}
  >
    <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Register</h2>

    <label className="flex items-center gap-2 mb-4">
      <input
        type="email"
        className="input input-bordered grow p-2 bg-gray-900 text-white rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
        placeholder="Email"
        aria-label="Email"
        autoComplete="current-email"
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>

    <label className="flex items-center gap-2 mb-4">
      <input
        type="password"
        className="input input-bordered grow p-2 bg-gray-900 text-white rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
        placeholder="Password"
        aria-label="Password"
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
    </label>

    <button className="btn btn-primary w-full py-2 mt-4 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-300">
      Register
    </button>

    <div className="divider text-gray-600 my-6">OR</div>

    <div className="flex justify-center">
      <GoogleLogin onSuccess={googleLogin} onError={() => toast.error("Google Login Failed")} />
    </div>
  </form>

  <ToastContainer position="top-center" />
</div>
        </>
    )
}