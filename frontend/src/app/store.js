import {configureStore} from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import sessionReducer from '../features/sessions/sessionSlice';
import adminReducer from '../features/admin/adminSlice';
import orgAdminReducer from '../features/orgAdmin/orgAdminSlice';
import drivesReducer from '../features/drives/drivesSlice';

const store=configureStore({
    reducer: {
        auth: authReducer,
        sessions: sessionReducer,
        admin: adminReducer,
        orgAdmin: orgAdminReducer,
        drives: drivesReducer,
    },
    devTools:true,
});

export default store
