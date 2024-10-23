
import {apiSlice} from '../api/apiSlice';
import { userLoggedIn } from './authSlice';

export const authApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        register: builder.mutation({
            query: (data) => ({
                url: '/register',
                method: 'POST',
                body: data,
            }), 
            async onQueryStarted(arg, {dispatch, queryFulfilled}) {
                try {
                    const result = await queryFulfilled;
                    console.log(result);
                    
                    localStorage.setItem('auth', JSON.stringify({
                        accessToken: result.data.accessToken,
                        user: result.data.user,
                    }));
                    dispatch(userLoggedIn({
                        accessToken: result.data.accessToken,
                        user: result.data.user,
                    }));
                } catch (error) {
                    console.error('Failed to register:', error );
                }
            },   
    }),
    login: builder.mutation({
        query: (data) => ({
            url: '/login',
            method: 'POST',
            body: data,
        }),
        async onQueryStarted(arg, {dispatch, queryFulfilled}) {
            try {
                const result = await queryFulfilled;
                localStorage.setItem('auth', JSON.stringify({
                    accessToken: result.data.accessToken,
                    user: result.data.user,
                }));
                dispatch(userLoggedIn({
                    accessToken: result.data.accessToken,
                    user: result.data.user,
                }));
            } catch (error) {
                console.error('Failed to register:', error );
            }
        },
    }),
    }),
});

export const {useRegisterMutation,useLoginMutation} = authApi