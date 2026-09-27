import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context.jsx";
import {
    registerUser,
    logoutUser,
    loginUser,
    getMe
} from "../services/auth.api";

export const useAuth = () => {

    const context = useContext(AuthContext);

    const {
        user,
        setUser,
        loading,
        setLoading
    } = context;

    const handleLogin = async (email, password) => {
        try {
            setLoading(true);

            const data = await loginUser({
                email,
                password
            });

            setUser(data.user);

        } catch (error) {
            console.error("Login failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async ({
        username,
        email,
        password
    }) => {
        try {
            setLoading(true);

            const data = await registerUser({
                username,
                email,
                password
            });

            setUser(data.user);

        } catch (error) {
            console.error("Registration failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);

            await logoutUser();

            setUser(null);

        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        const getAndSetUser = async () => {

            try {
                const data = await getMe();

                setUser(data.user);

            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getAndSetUser();

    }, []);

    return {
        user,
        loading,
        handleRegister,
        handleLogin,
        handleLogout
    };
};