import {createApi,fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import {userLoggedOut} from '../auth/authSlice';
 const baseQuery = fetchBaseQuery({
    baseUrl: 'http://localhost:9000/',
    prepareHeaders: async(headers, {getState,endpoint}) => {
        const token = getState()?.auth?.accessToken;
        if(token){
            headers.set('authorization', `Bearer ${token}`);
        }
        return headers;
    }
});
//https://chat-app-server-1-z141.onrender.com

export const apiSlice =  createApi({
    reducerPath: 'api',
    baseQuery: async(arg,api,extraOptions) => {
        let result = await baseQuery(arg,api,extraOptions);
        if(result.error?.status === 401){
            api.dispatch(userLoggedOut());
            localStorage.clear();
        }
        return result;
    },
    tagTypes :[],
    endpoints: (builder) => ({
        
    }),
});