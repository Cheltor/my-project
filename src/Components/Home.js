import React from 'react';
import { useAuth } from '../AuthContext';

const Home = () => {
    const { user } = useAuth(); // Get user data from context
    return (
        <div>
            <h1>Welcome to the Home component!</h1>
        </div>
    );
};

export default Home;