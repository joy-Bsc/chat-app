import {apiSlice} from '../api/apiSlice';

export const UsersApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getUsers: builder.query({
            query: (email)=>({
                url: `/users?email=${email}`,
                method: 'GET',
            }),
    }),
}),
});

export const {useGetUsersQuery} = UsersApi;