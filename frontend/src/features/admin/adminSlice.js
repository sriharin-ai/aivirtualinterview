import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const ADMIN_URL = `${import.meta.env.VITE_API_URL}/admin`;

const adminApi = axios.create({ baseURL: ADMIN_URL });
adminApi.interceptors.request.use((req) => {
    const token = localStorage.getItem('adminToken');
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return req;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const adminLogin = createAsyncThunk('admin/login', async (creds, thunkAPI) => {
    try {
        const { data } = await axios.post(`${ADMIN_URL}/login`, creds);
        localStorage.setItem('adminToken', data.token);
        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e.response?.data?.message || e.message);
    }
});

export const adminLogout = createAsyncThunk('admin/logout', async () => {
    localStorage.removeItem('adminToken');
});

// ─── Roles ────────────────────────────────────────────────────────────────────
export const fetchRoles = createAsyncThunk('admin/fetchRoles', async (_, thunkAPI) => {
    try { const { data } = await adminApi.get('/roles'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const createRole = createAsyncThunk('admin/createRole', async (body, thunkAPI) => {
    try { const { data } = await adminApi.post('/roles', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateRole = createAsyncThunk('admin/updateRole', async ({ id, body }, thunkAPI) => {
    try { const { data } = await adminApi.put(`/roles/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteRole = createAsyncThunk('admin/deleteRole', async (id, thunkAPI) => {
    try { await adminApi.delete(`/roles/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Skills ───────────────────────────────────────────────────────────────────
export const fetchSkills = createAsyncThunk('admin/fetchSkills', async (_, thunkAPI) => {
    try { const { data } = await adminApi.get('/skills'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const createSkill = createAsyncThunk('admin/createSkill', async (body, thunkAPI) => {
    try { const { data } = await adminApi.post('/skills', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateSkill = createAsyncThunk('admin/updateSkill', async ({ id, body }, thunkAPI) => {
    try { const { data } = await adminApi.put(`/skills/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteSkill = createAsyncThunk('admin/deleteSkill', async (id, thunkAPI) => {
    try { await adminApi.delete(`/skills/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Question Bank ─────────────────────────────────────────────────────────────
export const fetchQuestions = createAsyncThunk('admin/fetchQuestions', async (params, thunkAPI) => {
    try {
        const { data } = await adminApi.get('/questions', { params });
        return data;
    } catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const createQuestion = createAsyncThunk('admin/createQuestion', async (body, thunkAPI) => {
    try { const { data } = await adminApi.post('/questions', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateQuestion = createAsyncThunk('admin/updateQuestion', async ({ id, body }, thunkAPI) => {
    try { const { data } = await adminApi.put(`/questions/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteQuestion = createAsyncThunk('admin/deleteQuestion', async (id, thunkAPI) => {
    try { await adminApi.delete(`/questions/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const generateQuestions = createAsyncThunk('admin/generateQuestions', async (body, thunkAPI) => {
    try { const { data } = await adminApi.post('/questions/generate', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Templates ────────────────────────────────────────────────────────────────
export const fetchTemplates = createAsyncThunk('admin/fetchTemplates', async (_, thunkAPI) => {
    try { const { data } = await adminApi.get('/templates'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const createTemplate = createAsyncThunk('admin/createTemplate', async (body, thunkAPI) => {
    try { const { data } = await adminApi.post('/templates', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateTemplate = createAsyncThunk('admin/updateTemplate', async ({ id, body }, thunkAPI) => {
    try { const { data } = await adminApi.put(`/templates/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteTemplate = createAsyncThunk('admin/deleteTemplate', async (id, thunkAPI) => {
    try { await adminApi.delete(`/templates/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Seed Defaults ────────────────────────────────────────────────────────────
export const seedDefaults = createAsyncThunk('admin/seedDefaults', async (_, thunkAPI) => {
    try { const { data } = await adminApi.post('/seed'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Analytics ────────────────────────────────────────────────────────────────
export const fetchAnalytics = createAsyncThunk('admin/fetchAnalytics', async (_, thunkAPI) => {
    try { const { data } = await adminApi.get('/analytics'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Organizations ────────────────────────────────────────────────────────────
export const fetchOrganizations = createAsyncThunk('admin/fetchOrganizations', async (_, thunkAPI) => {
    try { const { data } = await adminApi.get('/organizations'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const createOrganization = createAsyncThunk('admin/createOrganization', async (body, thunkAPI) => {
    try { const { data } = await adminApi.post('/organizations', body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateOrganization = createAsyncThunk('admin/updateOrganization', async ({ id, body }, thunkAPI) => {
    try { const { data } = await adminApi.put(`/organizations/${id}`, body); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteOrganization = createAsyncThunk('admin/deleteOrganization', async (id, thunkAPI) => {
    try { await adminApi.delete(`/organizations/${id}`); return id; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Students ─────────────────────────────────────────────────────────────────
export const fetchStudents = createAsyncThunk('admin/fetchStudents', async (_, thunkAPI) => {
    try { const { data } = await adminApi.get('/students'); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});
export const fetchStudentSessions = createAsyncThunk('admin/fetchStudentSessions', async (id, thunkAPI) => {
    try { const { data } = await adminApi.get(`/students/${id}/sessions`); return data; }
    catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || e.message); }
});

// ─── Slice ────────────────────────────────────────────────────────────────────
const initialState = {
    adminUser: localStorage.getItem('adminToken') ? { token: localStorage.getItem('adminToken') } : null,
    roles: [], skills: [], questions: [], questionsMeta: { total: 0, page: 1, pages: 1 },
    templates: [], analytics: null,
    organizations: [],
    students: [], studentSessions: [],
    isLoading: false, isGenerating: false, error: null,
};

const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        const pending  = (state) => { state.isLoading = true; state.error = null; };
        const rejected = (state, action) => { state.isLoading = false; state.error = action.payload; };

        builder
            .addCase(adminLogin.fulfilled, (state, action) => { state.adminUser = action.payload; state.isLoading = false; })
            .addCase(adminLogout.fulfilled, (state) => { state.adminUser = null; })

            .addCase(fetchRoles.pending, pending)
            .addCase(fetchRoles.fulfilled, (state, a) => { state.isLoading = false; state.roles = a.payload; })
            .addCase(fetchRoles.rejected, rejected)
            .addCase(createRole.fulfilled, (state, a) => { state.roles.unshift(a.payload); })
            .addCase(updateRole.fulfilled, (state, a) => { const i = state.roles.findIndex(r => r._id === a.payload._id); if (i !== -1) state.roles[i] = a.payload; })
            .addCase(deleteRole.fulfilled, (state, a) => { state.roles = state.roles.filter(r => r._id !== a.payload); })

            .addCase(fetchSkills.pending, pending)
            .addCase(fetchSkills.fulfilled, (state, a) => { state.isLoading = false; state.skills = a.payload; })
            .addCase(fetchSkills.rejected, rejected)
            .addCase(createSkill.fulfilled, (state, a) => { state.skills.unshift(a.payload); })
            .addCase(updateSkill.fulfilled, (state, a) => { const i = state.skills.findIndex(s => s._id === a.payload._id); if (i !== -1) state.skills[i] = a.payload; })
            .addCase(deleteSkill.fulfilled, (state, a) => { state.skills = state.skills.filter(s => s._id !== a.payload); })

            .addCase(fetchQuestions.pending, pending)
            .addCase(fetchQuestions.fulfilled, (state, a) => { state.isLoading = false; state.questions = a.payload.questions; state.questionsMeta = { total: a.payload.total, page: a.payload.page, pages: a.payload.pages }; })
            .addCase(fetchQuestions.rejected, rejected)
            .addCase(createQuestion.fulfilled, (state, a) => { state.questions.unshift(a.payload); state.questionsMeta.total += 1; })
            .addCase(updateQuestion.fulfilled, (state, a) => { const i = state.questions.findIndex(q => q._id === a.payload._id); if (i !== -1) state.questions[i] = a.payload; })
            .addCase(deleteQuestion.fulfilled, (state, a) => { state.questions = state.questions.filter(q => q._id !== a.payload); state.questionsMeta.total = Math.max(0, state.questionsMeta.total - 1); })
            .addCase(generateQuestions.pending, (state) => { state.isGenerating = true; state.error = null; })
            .addCase(generateQuestions.fulfilled, (state, a) => { state.isGenerating = false; state.questions = [...a.payload.questions, ...state.questions]; state.questionsMeta.total += a.payload.generated; })
            .addCase(generateQuestions.rejected, (state, a) => { state.isGenerating = false; state.error = a.payload; })

            .addCase(fetchTemplates.pending, pending)
            .addCase(fetchTemplates.fulfilled, (state, a) => { state.isLoading = false; state.templates = a.payload; })
            .addCase(fetchTemplates.rejected, rejected)
            .addCase(createTemplate.fulfilled, (state, a) => { state.templates.unshift(a.payload); })
            .addCase(updateTemplate.fulfilled, (state, a) => { const i = state.templates.findIndex(t => t._id === a.payload._id); if (i !== -1) state.templates[i] = a.payload; })
            .addCase(deleteTemplate.fulfilled, (state, a) => { state.templates = state.templates.filter(t => t._id !== a.payload); })

            .addCase(fetchAnalytics.pending, pending)
            .addCase(fetchAnalytics.fulfilled, (state, a) => { state.isLoading = false; state.analytics = a.payload; })
            .addCase(fetchAnalytics.rejected, rejected)

            .addCase(fetchOrganizations.pending, pending)
            .addCase(fetchOrganizations.fulfilled, (state, a) => { state.isLoading = false; state.organizations = a.payload; })
            .addCase(fetchOrganizations.rejected, rejected)
            .addCase(createOrganization.fulfilled, (state, a) => { state.organizations.unshift(a.payload); })
            .addCase(updateOrganization.fulfilled, (state, a) => { const i = state.organizations.findIndex(o => o._id === a.payload._id); if (i !== -1) state.organizations[i] = a.payload; })
            .addCase(deleteOrganization.fulfilled, (state, a) => { state.organizations = state.organizations.filter(o => o._id !== a.payload); })

            .addCase(fetchStudents.pending, pending)
            .addCase(fetchStudents.fulfilled, (state, a) => { state.isLoading = false; state.students = a.payload; })
            .addCase(fetchStudents.rejected, rejected)
            .addCase(fetchStudentSessions.pending, pending)
            .addCase(fetchStudentSessions.fulfilled, (state, a) => { state.isLoading = false; state.studentSessions = a.payload; })
            .addCase(fetchStudentSessions.rejected, rejected);
    },
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;
