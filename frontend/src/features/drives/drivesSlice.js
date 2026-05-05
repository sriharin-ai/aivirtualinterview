import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE = `${import.meta.env.VITE_API_URL}`;

const authApi = axios.create({ baseURL: BASE });
authApi.interceptors.request.use(cfg => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user?.token;
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

export const fetchEligibleDrives = createAsyncThunk('drives/fetchEligible', async (_, thunkAPI) => {
    try { const { data } = await authApi.get('/drives'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchMyEnrollments = createAsyncThunk('drives/fetchMyEnrollments', async (_, thunkAPI) => {
    try { const { data } = await authApi.get('/drives/my-enrollments'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchStudentLeaderboard = createAsyncThunk('drives/fetchStudentLeaderboard', async (driveId, thunkAPI) => {
    try { const { data } = await authApi.get(`/drives/${driveId}/leaderboard`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const enrollInDrive = createAsyncThunk('drives/enroll', async (driveId, thunkAPI) => {
    try { const { data } = await authApi.post(`/drives/${driveId}/enroll`); return { driveId, enrollment: data }; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

const drivesSlice = createSlice({
    name: 'drives',
    initialState: {
        eligibleDrives: [],
        myEnrollments: [],
        studentLeaderboard: null,
        isLoading: false,
        error: null,
    },
    reducers: {
        clearDrivesError(state) { state.error = null; },
        clearStudentLeaderboard(state) { state.studentLeaderboard = null; },
    },
    extraReducers: (builder) => {
        const pending  = s => { s.isLoading = true; s.error = null; };
        const rejected = (s, a) => { s.isLoading = false; s.error = a.payload; };

        builder
            .addCase(fetchEligibleDrives.pending, pending)
            .addCase(fetchEligibleDrives.fulfilled, (s, a) => { s.isLoading = false; s.eligibleDrives = a.payload; })
            .addCase(fetchEligibleDrives.rejected, rejected)

            .addCase(fetchMyEnrollments.pending, pending)
            .addCase(fetchMyEnrollments.fulfilled, (s, a) => { s.isLoading = false; s.myEnrollments = a.payload; })
            .addCase(fetchMyEnrollments.rejected, rejected)

            .addCase(fetchStudentLeaderboard.pending, pending)
            .addCase(fetchStudentLeaderboard.fulfilled, (s, a) => { s.isLoading = false; s.studentLeaderboard = a.payload; })
            .addCase(fetchStudentLeaderboard.rejected, rejected)

            .addCase(enrollInDrive.fulfilled, (s, a) => {
                const { driveId, enrollment } = a.payload;
                const idx = s.eligibleDrives.findIndex(d => d._id === driveId);
                if (idx !== -1) s.eligibleDrives[idx] = { ...s.eligibleDrives[idx], enrollment };
            });
    },
});

export const { clearDrivesError, clearStudentLeaderboard } = drivesSlice.actions;
export default drivesSlice.reducer;
