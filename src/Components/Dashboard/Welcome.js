import React, { useEffect } from "react";
import { useAuth } from "../../AuthContext";

const Welcome = React.memo(() => {
  const { user } = useAuth();

  useEffect(() => {
    console.log("User:", user);
  }, [user]);

  if (!user) {
    return <div>Loading...</div>; // or any other loading indicator
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto text-center">
          <h1 className="text-2xl font-semibold leading-8 text-gray-900">Welcome, {user.name}!</h1>
        </div>
      </div>
    </div>
  );
});

Welcome.displayName = 'Welcome';

export default Welcome;