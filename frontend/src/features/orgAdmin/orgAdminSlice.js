import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE = `${import.meta.env.VITE_API_URL}/org-admin`;

const orgApi = axios.create({ baseURL: BASE });
orgApi.interceptors.request.use(cfg => {
    const token = localStorage.getItem('orgAdminToken');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const orgAdminLogin = createAsyncThunk('orgAdmin/login', async (creds, thunkAPI) => {
    try {
        const { data } = await axios.post(`${BASE}/login`, creds);
        localStorage.setItem('orgAdminToken', data.token);
        return data;
    } catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchOrgInfo = createAsyncThunk('orgAdmin/fetchOrgInfo', async (_, thunkAPI) => {
    try { const { data } = await orgApi.get('/me'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchOrgStudents = createAsyncThunk('orgAdmin/fetchStudents', async (filters = {}, thunkAPI) => {
    try {
        const params = new URLSearchParams();
        if (filters.department) params.set('department', filters.department);
        if (filters.batch)      params.set('batch',      filters.batch);
        const { data } = await orgApi.get(`/students?${params.toString()}`);
        return data;
    }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const addOrgStudent = createAsyncThunk('orgAdmin/addStudent', async (body, thunkAPI) => {
    try { const { data } = await orgApi.post('/students', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const updateOrgStudent = createAsyncThunk('orgAdmin/updateStudent', async ({ id, body }, thunkAPI) => {
    try { const { data } = await orgApi.put(`/students/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const deleteOrgStudent = createAsyncThunk('orgAdmin/deleteStudent', async (id, thunkAPI) => {
    try { await orgApi.delete(`/students/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const bulkAddOrgStudents = createAsyncThunk('orgAdmin/bulkAdd', async (students, thunkAPI) => {
    try { const { data } = await orgApi.post('/students/bulk', { students }); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchOrgAnalytics = createAsyncThunk('orgAdmin/fetchAnalytics', async (filters = {}, thunkAPI) => {
    try {
        const params = new URLSearchParams();
        if (filters.department) params.set('department', filters.department);
        if (filters.batch)      params.set('batch',      filters.batch);
        const { data } = await orgApi.get(`/analytics?${params.toString()}`);
        return data;
    }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchStudentSessions = createAsyncThunk('orgAdmin/fetchStudentSessions', async (id, thunkAPI) => {
    try { const { data } = await orgApi.get(`/students/${id}/sessions`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchSubjectAnalytics = createAsyncThunk('orgAdmin/fetchSubjectAnalytics', async (filters = {}, thunkAPI) => {
    try {
        const params = new URLSearchParams();
        if (filters.department) params.set('department', filters.department);
        if (filters.batch)      params.set('batch',      filters.batch);
        const { data } = await orgApi.get(`/subject-analytics?${params.toString()}`);
        return data;
    }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchRoleAnalytics = createAsyncThunk('orgAdmin/fetchRoleAnalytics', async (_, thunkAPI) => {
    try { const { data } = await orgApi.get('/role-analytics'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchDigestConfig = createAsyncThunk('orgAdmin/fetchDigestConfig', async (_, thunkAPI) => {
    try { const { data } = await orgApi.get('/digest-config'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const updateDigestConfig = createAsyncThunk('orgAdmin/updateDigestConfig', async (body, thunkAPI) => {
    try { const { data } = await orgApi.put('/digest-config', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const sendDigestNow = createAsyncThunk('orgAdmin/sendDigestNow', async (_, thunkAPI) => {
    try { const { data } = await orgApi.post('/digest-send-now'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchDepartments = createAsyncThunk('orgAdmin/fetchDepartments', async (_, thunkAPI) => {
    try { const { data } = await orgApi.get('/departments'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const addDepartment = createAsyncThunk('orgAdmin/addDepartment', async (name, thunkAPI) => {
    try { const { data } = await orgApi.post('/departments', { name }); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const deleteDepartment = createAsyncThunk('orgAdmin/deleteDepartment', async (name, thunkAPI) => {
    try { const { data } = await orgApi.delete(`/departments/${encodeURIComponent(name)}`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchBatches = createAsyncThunk('orgAdmin/fetchBatches', async (_, thunkAPI) => {
    try { const { data } = await orgApi.get('/batches'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const addBatch = createAsyncThunk('orgAdmin/addBatch', async (body, thunkAPI) => {
    try { const { data } = await orgApi.post('/batches', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const updateBatch = createAsyncThunk('orgAdmin/updateBatch', async ({ id, body }, thunkAPI) => {
    try { const { data } = await orgApi.put(`/batches/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const deleteBatch = createAsyncThunk('orgAdmin/deleteBatch', async (id, thunkAPI) => {
    try { const { data } = await orgApi.delete(`/batches/${id}`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const sendInvites = createAsyncThunk('orgAdmin/sendInvites', async ({ emails, department, batch } = {}, thunkAPI) => {
    try { const { data } = await orgApi.post('/invite', { emails, department, batch }); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchTeamGoals = createAsyncThunk('orgAdmin/fetchTeamGoals', async (filters = {}, thunkAPI) => {
    try {
        const params = new URLSearchParams();
        if (filters.department) params.set('department', filters.department);
        if (filters.batch)      params.set('batch',      filters.batch);
        const { data } = await orgApi.get(`/team-goals?${params.toString()}`);
        return data;
    }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const sendNudge = createAsyncThunk('orgAdmin/sendNudge', async (userId, thunkAPI) => {
    try { const { data } = await orgApi.post(`/students/${userId}/nudge`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchDrives = createAsyncThunk('orgAdmin/fetchDrives', async (_, thunkAPI) => {
    try { const { data } = await orgApi.get('/drives'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const createDrive = createAsyncThunk('orgAdmin/createDrive', async (body, thunkAPI) => {
    try { const { data } = await orgApi.post('/drives', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const updateDrive = createAsyncThunk('orgAdmin/updateDrive', async ({ id, body }, thunkAPI) => {
    try { const { data } = await orgApi.put(`/drives/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const deleteDrive = createAsyncThunk('orgAdmin/deleteDrive', async (id, thunkAPI) => {
    try { await orgApi.delete(`/drives/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const closeDrive = createAsyncThunk('orgAdmin/closeDrive', async (id, thunkAPI) => {
    try { const { data } = await orgApi.post(`/drives/${id}/close`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchDriveLeaderboard = createAsyncThunk('orgAdmin/fetchDriveLeaderboard', async (id, thunkAPI) => {
    try { const { data } = await orgApi.get(`/drives/${id}/leaderboard`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchDriveAnalytics = createAsyncThunk('orgAdmin/fetchDriveAnalytics', async (id, thunkAPI) => {
    try { const { data } = await orgApi.get(`/drives/${id}/analytics`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchQuestionPacks = createAsyncThunk('orgAdmin/fetchQuestionPacks', async (_, thunkAPI) => {
    try { const { data } = await orgApi.get('/question-packs'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const createQuestionPack = createAsyncThunk('orgAdmin/createQuestionPack', async (body, thunkAPI) => {
    try { const { data } = await orgApi.post('/question-packs', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const updateQuestionPack = createAsyncThunk('orgAdmin/updateQuestionPack', async ({ id, body }, thunkAPI) => {
    try { const { data } = await orgApi.put(`/question-packs/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const deleteQuestionPack = createAsyncThunk('orgAdmin/deleteQuestionPack', async (id, thunkAPI) => {
    try { await orgApi.delete(`/question-packs/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchAvailableQuestions = createAsyncThunk('orgAdmin/fetchAvailableQuestions', async (params = {}, thunkAPI) => {
    try {
        const qs = new URLSearchParams(params).toString();
        const { data } = await orgApi.get(`/question-bank?${qs}`);
        return data;
    }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Slice ────────────────────────────────────────────────────────────────────
const storedToken = localStorage.getItem('orgAdminToken');
let storedOrg = null;
if (storedToken) {
    try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        storedOrg = { token: storedToken, orgId: payload.orgId, orgName: payload.orgName, orgType: payload.orgType, orgCode: payload.orgCode };
    } catch {}
}

const orgAdminSlice = createSlice({
    name: 'orgAdmin',
    initialState: {
        orgAdmin: storedOrg,
        orgInfo: null,
        students: [],
        analytics: null,
        subjectAnalytics: null,
        roleAnalytics: null,
        studentSessions: [],
        digestConfig: null,
        teamGoals: [],
        departments: [],
        batches: [],
        drives: [],
        driveLeaderboard: null,
        driveAnalytics: null,
        questionPacks: [],
        availableQuestions: [],
        isLoading: false,
        error: null,
    },
    reducers: {
        orgAdminLogout(state) {
            state.orgAdmin = null;
            state.orgInfo  = null;
            state.students = [];
            state.analytics = null;
            state.digestConfig = null;
            state.departments = [];
            state.batches = [];
            localStorage.removeItem('orgAdminToken');
        },
        clearOrgError(state) { state.error = null; },
    },
    extraReducers: (builder) => {
        const pending   = s => { s.isLoading = true; s.error = null; };
        const rejected  = (s, a) => { s.isLoading = false; s.error = a.payload; };

        builder
            .addCase(orgAdminLogin.pending, pending)
            .addCase(orgAdminLogin.fulfilled, (s, a) => { s.isLoading = false; s.orgAdmin = a.payload; })
            .addCase(orgAdminLogin.rejected, rejected)

            .addCase(fetchOrgInfo.pending, pending)
            .addCase(fetchOrgInfo.fulfilled, (s, a) => {
                s.isLoading = false;
                s.orgInfo = a.payload;
                s.departments = a.payload.departments || [];
                s.batches = a.payload.batches || [];
            })
            .addCase(fetchOrgInfo.rejected, rejected)

            .addCase(fetchOrgStudents.pending, pending)
            .addCase(fetchOrgStudents.fulfilled, (s, a) => { s.isLoading = false; s.students = a.payload; })
            .addCase(fetchOrgStudents.rejected, rejected)

            .addCase(addOrgStudent.fulfilled, (s, a) => { s.students.unshift(a.payload); })
            .addCase(updateOrgStudent.fulfilled, (s, a) => {
                const i = s.students.findIndex(u => u._id === a.payload._id);
                if (i !== -1) s.students[i] = { ...s.students[i], ...a.payload };
            })
            .addCase(deleteOrgStudent.fulfilled, (s, a) => { s.students = s.students.filter(u => u._id !== a.payload); })
            .addCase(bulkAddOrgStudents.pending, pending)
            .addCase(bulkAddOrgStudents.fulfilled, (s) => { s.isLoading = false; })
            .addCase(bulkAddOrgStudents.rejected, rejected)

            .addCase(fetchOrgAnalytics.pending, pending)
            .addCase(fetchOrgAnalytics.fulfilled, (s, a) => { s.isLoading = false; s.analytics = a.payload; })
            .addCase(fetchOrgAnalytics.rejected, rejected)

            .addCase(fetchStudentSessions.pending, pending)
            .addCase(fetchStudentSessions.fulfilled, (s, a) => { s.isLoading = false; s.studentSessions = a.payload; })
            .addCase(fetchStudentSessions.rejected, rejected)

            .addCase(fetchSubjectAnalytics.pending, pending)
            .addCase(fetchSubjectAnalytics.fulfilled, (s, a) => { s.isLoading = false; s.subjectAnalytics = a.payload; })
            .addCase(fetchSubjectAnalytics.rejected, rejected)

            .addCase(fetchRoleAnalytics.pending, pending)
            .addCase(fetchRoleAnalytics.fulfilled, (s, a) => { s.isLoading = false; s.roleAnalytics = a.payload; })
            .addCase(fetchRoleAnalytics.rejected, rejected)

            .addCase(fetchDigestConfig.fulfilled, (s, a) => { s.digestConfig = a.payload; })
            .addCase(updateDigestConfig.fulfilled, (s, a) => { s.digestConfig = a.payload; })

            .addCase(fetchDepartments.fulfilled, (s, a) => { s.departments = a.payload; })
            .addCase(addDepartment.fulfilled,    (s, a) => { s.departments = a.payload; })
            .addCase(deleteDepartment.fulfilled, (s, a) => { s.departments = a.payload; })

            .addCase(fetchBatches.fulfilled, (s, a) => { s.batches = a.payload; })
            .addCase(addBatch.fulfilled,     (s, a) => { s.batches = a.payload; })
            .addCase(updateBatch.fulfilled,  (s, a) => { s.batches = a.payload; })
            .addCase(deleteBatch.fulfilled,  (s, a) => { s.batches = a.payload; })

            .addCase(fetchTeamGoals.pending,   pending)
            .addCase(fetchTeamGoals.fulfilled,  (s, a) => { s.isLoading = false; s.teamGoals = a.payload; })
            .addCase(fetchTeamGoals.rejected,   rejected)

            .addCase(fetchDrives.pending,   pending)
            .addCase(fetchDrives.fulfilled,  (s, a) => { s.isLoading = false; s.drives = a.payload; })
            .addCase(fetchDrives.rejected,   rejected)

            .addCase(createDrive.fulfilled, (s, a) => { s.drives.unshift(a.payload); })
            .addCase(updateDrive.fulfilled, (s, a) => {
                const i = s.drives.findIndex(d => d._id === a.payload._id);
                if (i !== -1) s.drives[i] = a.payload;
            })
            .addCase(deleteDrive.fulfilled, (s, a) => { s.drives = s.drives.filter(d => d._id !== a.payload); })
            .addCase(closeDrive.fulfilled, (s, a) => {
                const i = s.drives.findIndex(d => d._id === a.payload._id);
                if (i !== -1) s.drives[i] = { ...s.drives[i], ...a.payload };
            })
            .addCase(fetchDriveLeaderboard.pending,  pending)
            .addCase(fetchDriveLeaderboard.fulfilled, (s, a) => { s.isLoading = false; s.driveLeaderboard = a.payload; })
            .addCase(fetchDriveLeaderboard.rejected,  rejected)

            .addCase(fetchDriveAnalytics.pending,  pending)
            .addCase(fetchDriveAnalytics.fulfilled, (s, a) => { s.isLoading = false; s.driveAnalytics = a.payload; })
            .addCase(fetchDriveAnalytics.rejected,  rejected)

            .addCase(fetchQuestionPacks.pending,   pending)
            .addCase(fetchQuestionPacks.fulfilled,  (s, a) => { s.isLoading = false; s.questionPacks = a.payload; })
            .addCase(fetchQuestionPacks.rejected,   rejected)

            .addCase(createQuestionPack.fulfilled, (s, a) => { s.questionPacks.unshift(a.payload); })
            .addCase(updateQuestionPack.fulfilled, (s, a) => {
                const i = s.questionPacks.findIndex(p => p._id === a.payload._id);
                if (i !== -1) s.questionPacks[i] = a.payload;
            })
            .addCase(deleteQuestionPack.fulfilled, (s, a) => { s.questionPacks = s.questionPacks.filter(p => p._id !== a.payload); })

            .addCase(fetchAvailableQuestions.pending,   pending)
            .addCase(fetchAvailableQuestions.fulfilled,  (s, a) => { s.isLoading = false; s.availableQuestions = a.payload; })
            .addCase(fetchAvailableQuestions.rejected,   rejected);
    },
});

export const { orgAdminLogout, clearOrgError } = orgAdminSlice.actions;
export default orgAdminSlice.reducer;
