"use client";

import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  Users, 
  PhoneCall, 
  Settings, 
  ClipboardCheck, 
  Search, 
  Play, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Calendar, 
  FileText,
  Volume2,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Database
} from "lucide-react";

const API_BASE = "http://localhost:8000";

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"search" | "dashboard" | "agents" | "attendance">("search");
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // --- TAB 1: SEARCH & OUTREACH STATE ---
  const [jobDescription, setJobDescription] = useState<string>(
    "We are looking for a Backend Engineer with 3+ years of experience in Python and FastAPI. The candidate should be skilled in SQL, PostgreSQL, and Docker containerization. Location: Bengaluru. Notice period: less than 30 days."
  );
  const [searchSource, setSearchSource] = useState<string>("Local");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<{ message?: string; isFallback?: boolean }>({});
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState<string>("");
  const [editName, setEditName] = useState<string>("");

  // Outreach Modal
  const [showOutreachModal, setShowOutreachModal] = useState<boolean>(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [agentVariables, setAgentVariables] = useState<Record<string, string>>({});
  const [triggeringOutreach, setTriggeringOutreach] = useState<boolean>(false);
  const [outreachResult, setOutreachResult] = useState<any>(null);

  // --- TAB 2: DASHBOARD STATE ---
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState<boolean>(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // --- TAB 3: AGENTS STATE ---
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState<boolean>(false);
  const [showCreateAgentForm, setShowCreateAgentForm] = useState<boolean>(false);
  const [newAgent, setNewAgent] = useState({
    name: "Custom Screening Agent",
    language: "ENGLISH",
    voice_persona: "NEHA",
    persona_name: "Sarah",
    agent_prompt: "You are {persona_name}, a technical recruiter calling candidates to qualify them for software engineering roles. Ask them about their notice period, current organization name, and salary expectations.",
    objective: "Automated candidate qualification call.",
    introduction: "Hello! Am I speaking with {callee_name}? This is {persona_name} calling from Acme Tech. I wanted to follow up on your software engineer application.",
    result_prompt: "Extract candidate notice period, expected salary, and current organization name.",
    result_schema_str: '{\n  "notice_period": "string",\n  "expected_salary": "string",\n  "current_organization": "string"\n}'
  });
  const [creatingAgent, setCreatingAgent] = useState<boolean>(false);
  const [agentCreationMsg, setAgentCreationMsg] = useState<{ text: string; error: boolean } | null>(null);

  // --- TAB 4: ATTENDANCE STATE ---
  const [simEmployee, setSimEmployee] = useState({
    id: "EMP-101",
    name: "Amit Sharma",
    location_id: "LOC-01",
    location_name: "Bengaluru Core",
    message: "Hi, I am Amit Sharma, ID EMP-101. Passcode today is 4821. Successfully arrived at Bengaluru Site Core."
  });
  const [simChannel, setSimChannel] = useState<"Voice IVR" | "SMS Check-in">("Voice IVR");
  const [simulatingAttendance, setSimulatingAttendance] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  // Simulated Employee List
  const simulatedEmployees = [
    { id: "EMP-101", name: "Amit Sharma", loc_id: "LOC-01", loc_name: "Bengaluru Core", msg: "Hello, I am Amit Sharma, Employee ID EMP-101. Passcode today is 4821. Checking in." },
    { id: "EMP-102", name: "Priya Patel", loc_id: "LOC-02", loc_name: "Mumbai Office", msg: "Priya Patel check-in. Employee 102 at Mumbai Office, code 4821." },
    { id: "EMP-104", name: "Sneha Reddy", loc_id: "LOC-03", loc_name: "Hyderabad Hub", msg: "I am Sneha Reddy, ID EMP-104. Passcode is 4821. Registered site check-in." },
    { id: "EMP-107", name: "Karan Malhotra", loc_id: "LOC-05", loc_name: "Pune Tech", msg: "Karan check in at Pune. Passcode is 4821. ID EMP-107." }
  ];

  // --- CORE SYSTEM EFFECTS ---
  useEffect(() => {
    // Check backend connection & load initial data
    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/agents`);
        if (res.ok) {
          setBackendConnected(true);
          const data = await res.json();
          setAgents(data.results || []);
          if (data.results && data.results.length > 0) {
            setSelectedAgentId(data.results[0].id);
          }
        } else {
          setBackendConnected(false);
        }
      } catch (err) {
        setBackendConnected(false);
      }
    };
    checkConnection();
  }, [refreshKey]);

  // Load call logs
  const fetchCallLogs = async () => {
    setLoadingCalls(true);
    try {
      const res = await fetch(`${API_BASE}/api/calls`);
      if (res.ok) {
        const data = await res.json();
        setCallLogs(data);
      }
    } catch (err) {
      console.error("Error loading call logs:", err);
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchCallLogs();
      // Start polling call logs while on dashboard tab
      const interval = setInterval(fetchCallLogs, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Load attendance logs
  const fetchAttendanceLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/logs`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendanceLogs();
    }
  }, [activeTab]);

  // --- HANDLERS ---

  // Candidate Search
  const handleSearch = async () => {
    setLoadingSearch(true);
    setSearchFeedback({});
    setSelectedCandidateIds([]);
    try {
      const res = await fetch(`${API_BASE}/api/people/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jobDescription,
          source: searchSource
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.results || []);
        if (data.api_fallback) {
          setSearchFeedback({ message: data.message, isFallback: true });
        }
      } else {
        setSearchFeedback({ message: "Failed to perform search. Ensure backend is running.", isFallback: false });
      }
    } catch (err) {
      setSearchFeedback({ message: "Connection to backend failed.", isFallback: false });
    } finally {
      setLoadingSearch(false);
    }
  };

  // Inline editing candidate phone / name
  const startEditCandidate = (cand: any) => {
    setEditingCandidateId(cand.id);
    setEditPhone(cand.mobile_number);
    setEditName(cand.name);
  };

  const saveEditCandidate = (candId: string) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candId) {
        return { ...c, name: editName, mobile_number: editPhone };
      }
      return c;
    }));
    setEditingCandidateId(null);
  };

  // Select candidates
  const toggleCandidateSelection = (candId: string) => {
    setSelectedCandidateIds(prev => 
      prev.includes(candId) ? prev.filter(id => id !== candId) : [...prev, candId]
    );
  };

  const toggleSelectAllCandidates = () => {
    if (selectedCandidateIds.length === candidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(candidates.map(c => c.id));
    }
  };

  // Agent Selection inside Outreach Modal
  useEffect(() => {
    const agent = agents.find(a => a.id === selectedAgentId);
    if (agent && agent.custom_variables) {
      const initialVars: Record<string, string> = {};
      agent.custom_variables.forEach((v: string) => {
        // Pre-populate some defaults based on Search tab state
        if (v === "job_title" || v === "role_title") initialVars[v] = "Backend Engineer";
        else if (v === "company" || v === "company_name") initialVars[v] = "Acme Corp";
        else if (v === "location" || v === "job_location") initialVars[v] = "Bengaluru";
        else if (v === "experience_range") initialVars[v] = "3 to 5 years";
        else if (v === "required_skills") initialVars[v] = "Python, FastAPI, SQL";
        else if (v === "job_summary") initialVars[v] = "Develop robust APIs using FastAPI and Python in a Docker container environment.";
        else if (v === "interview_questions") initialVars[v] = "What notice period do you have? What are your salary expectations?";
        else initialVars[v] = "";
      });
      setAgentVariables(initialVars);
    }
  }, [selectedAgentId, agents]);

  // Trigger Outreach
  const handleTriggerOutreach = async () => {
    setTriggeringOutreach(true);
    setOutreachResult(null);
    const selectedCands = candidates.filter(c => selectedCandidateIds.includes(c.id));
    
    try {
      const res = await fetch(`${API_BASE}/api/reachout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgentId,
          candidates: selectedCands,
          custom_data_template: agentVariables
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setOutreachResult({
          success: true,
          message: `Successfully placed outbound call(s) for ${data.calls_created} candidates! Check the Dashboard tab to monitor progress.`
        });
        setSelectedCandidateIds([]);
        // Auto close after 3 seconds
        setTimeout(() => {
          setShowOutreachModal(false);
          setOutreachResult(null);
          setActiveTab("dashboard");
        }, 3000);
      } else {
        setOutreachResult({
          success: false,
          message: data.detail?.message || data.detail || "Call outreach failed. Check API configuration."
        });
      }
    } catch (err: any) {
      setOutreachResult({
        success: false,
        message: "Outreach request failed: Connection error."
      });
    } finally {
      setTriggeringOutreach(false);
    }
  };

  // Create Custom Agent
  const handleCreateAgent = async () => {
    setCreatingAgent(true);
    setAgentCreationMsg(null);
    try {
      let schema = {};
      try {
        schema = JSON.parse(newAgent.result_schema_str);
      } catch (e) {
        setAgentCreationMsg({ text: "Invalid JSON Schema format.", error: true });
        setCreatingAgent(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAgent.name,
          language: newAgent.language,
          voice_persona: newAgent.voice_persona,
          persona_name: newAgent.persona_name,
          agent_prompt: newAgent.agent_prompt,
          objective: newAgent.objective,
          introduction: newAgent.introduction,
          result_prompt: newAgent.result_prompt,
          result_schema: schema
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAgentCreationMsg({ text: `Successfully registered Agent: ${data.name}!`, error: false });
        setShowCreateAgentForm(false);
        setRefreshKey(prev => prev + 1);
      } else {
        setAgentCreationMsg({ text: data.detail?.message || JSON.stringify(data.detail) || "Failed to register agent.", error: true });
      }
    } catch (err) {
      setAgentCreationMsg({ text: "Server connection failed.", error: true });
    } finally {
      setCreatingAgent(false);
    }
  };

  // Simulate Attendance
  const handleSimulateAttendance = async () => {
    setSimulatingAttendance(true);
    setSimResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: simEmployee.id,
          employee_name: simEmployee.name,
          location_id: simEmployee.location_id,
          location_name: simEmployee.location_name,
          message: simEmployee.message
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
        fetchAttendanceLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingAttendance(false);
    }
  };

  // Update employee select in simulation
  const handleSelectSimEmployee = (empId: string) => {
    const emp = simulatedEmployees.find(e => e.id === empId);
    if (emp) {
      setSimEmployee({
        id: emp.id,
        name: emp.name,
        location_id: emp.loc_id,
        location_name: emp.loc_name,
        message: emp.msg
      });
    }
  };

  // Custom metrics calculation helper
  const getMetrics = () => {
    const totalCalls = callLogs.length;
    const completed = callLogs.filter(c => c.status === "COMPLETED").length;
    const answered = callLogs.filter(c => c.answered_by === "HUMAN").length;
    
    // Connected rate (Completed / Total)
    const connectRate = totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0;
    
    // Qualification rate: checks if "interested" or "qualified" was positive in the results JSON
    let interested = 0;
    callLogs.forEach(c => {
      if (c.result) {
        const r = c.result;
        // Search keys for true/yes
        const isInterested = r.interested === true || r.interested === "Yes" || r.open_to_opportunities === "Yes" || r.open_to_opportunity === "Yes";
        if (isInterested) interested++;
      }
    });
    const qualifyRate = completed > 0 ? Math.round((interested / completed) * 100) : 0;

    return { totalCalls, connectRate, qualifyRate };
  };

  const metrics = getMetrics();

  return (
    <div className="flex-1 flex flex-col relative min-h-screen">
      <div className="glow-orb-1" />
      <div className="glow-orb-2" />

      {/* HEADER NAVBAR */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 p-2 rounded-lg text-white">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              HunarHire
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI</span>
            </h1>
            <p className="text-xs text-gray-400">Recruitment & Offline Attendance Platform</p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <span className="text-gray-500">API Gateway:</span>
            {backendConnected ? (
              <span className="flex items-center text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 status-active-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center text-red-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></span>
                Disconnected
              </span>
            )}
          </div>
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 transition text-gray-400 hover:text-white"
            title="Refresh Connection"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        
        {/* METRICS HEADER CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 flex items-center space-x-4">
            <div className="bg-indigo-500/10 p-3 rounded-lg text-indigo-400 border border-indigo-500/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Outreach Calls</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{metrics.totalCalls}</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center space-x-4">
            <div className="bg-cyan-500/10 p-3 rounded-lg text-cyan-400 border border-cyan-500/20">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Call Connect Rate</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{metrics.connectRate}%</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center space-x-4">
            <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Candidate Interest</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{metrics.qualifyRate}%</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center space-x-4">
            <div className="bg-amber-500/10 p-3 rounded-lg text-amber-400 border border-amber-500/20">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Attendance Logged</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{attendanceLogs.length} Check-ins</h3>
            </div>
          </div>
        </div>

        {/* WORKSPACE TAB SWITCHER */}
        <div className="flex border-b border-gray-800 space-x-2 bg-gray-900/40 p-1.5 rounded-lg border">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "search" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search & Reachout</span>
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "dashboard" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Outreach Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("agents")}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "agents" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Voice Agents Registry</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "attendance" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Offline Attendance (1000 PPL)</span>
          </button>
        </div>

        {/* WORKSPACE CONTENT AREA */}
        <div className="flex-1">

          {/* TAB 1: SEARCH & REACHOUT WORKSPACE */}
          {activeTab === "search" && (
            <div className="space-y-6">
              {/* Job Description Input & Source Selection */}
              <div className="glass-panel p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-400" />
                      Candidate Search Engine
                    </h2>
                    <p className="text-xs text-gray-400">Match potential candidates from Job Description queries</p>
                  </div>

                  {/* Search API Integrations Choice */}
                  <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 p-1.5 rounded-lg">
                    <span className="text-[11px] text-gray-500 font-medium px-2">Data Source:</span>
                    {["Local", "Apollo", "Proxycurl", "PDL", "Coresignal"].map(src => (
                      <button
                        key={src}
                        onClick={() => setSearchSource(src)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition ${
                          searchSource === src 
                            ? "bg-indigo-600 text-white" 
                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                        }`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Job Description query</label>
                  <textarea
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="Enter Job Description or search parameters..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>Search queries are mapped semantically against candidate profiles</span>
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loadingSearch}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-bold flex items-center space-x-2 hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loadingSearch ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Searching API...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Match Candidates</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* API Fallback Feedback banner */}
              {searchFeedback.message && (
                <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
                  searchFeedback.isFallback 
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300" 
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                }`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider">
                      {searchFeedback.isFallback ? "Integration Fallback Notice" : "API Operation Status"}
                    </h5>
                    <p className="text-sm mt-0.5">{searchFeedback.message}</p>
                  </div>
                </div>
              )}

              {/* SEARCH RESULTS LIST */}
              {candidates.length > 0 && (
                <div className="glass-panel overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/30">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Candidate Matching Records</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Select candidates to trigger voice qualification outbound calls.</p>
                    </div>

                    {selectedCandidateIds.length > 0 && (
                      <button
                        onClick={() => setShowOutreachModal(true)}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition flex items-center space-x-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Outreach Selected ({selectedCandidateIds.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-950/40">
                          <th className="p-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.length === candidates.length && candidates.length > 0}
                              onChange={toggleSelectAllCandidates}
                              className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </th>
                          <th className="p-4">Candidate Profile</th>
                          <th className="p-4">Experience & Location</th>
                          <th className="p-4">Skills Matching</th>
                          <th className="p-4 text-center">Match Score</th>
                          <th className="p-4">Mobile Reachout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850">
                        {candidates.map((cand) => (
                          <tr key={cand.id} className="hover:bg-gray-900/40 transition">
                            <td className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedCandidateIds.includes(cand.id)}
                                onChange={() => toggleCandidateSelection(cand.id)}
                                className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                                  {cand.name.split(" ").map((n: string) => n[0]).join("")}
                                </div>
                                <div>
                                  {editingCandidateId === cand.id ? (
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="bg-gray-950 border border-gray-800 rounded px-2 py-0.5 text-xs text-white"
                                    />
                                  ) : (
                                    <h4 className="text-sm font-bold text-white">{cand.name}</h4>
                                  )}
                                  <div className="flex items-center space-x-1.5 mt-0.5 text-xs text-gray-400">
                                    <span className="font-semibold text-gray-300">{cand.job_title}</span>
                                    <span>•</span>
                                    <span>{cand.current_company}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-xs space-y-0.5 text-gray-300">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{cand.experience_years} Years Exp</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{cand.location}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {cand.skills.map((skill: string, i: number) => {
                                  const isMatched = cand.matched_skills?.includes(skill);
                                  return (
                                    <span 
                                      key={i} 
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                        isMatched 
                                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" 
                                          : "bg-gray-900 border-gray-800 text-gray-500"
                                      }`}
                                    >
                                      {skill}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                                cand.match_score >= 80 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : cand.match_score >= 50
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                  : "bg-gray-800 border-gray-700 text-gray-400"
                              }`}>
                                {cand.match_score}% Match
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                {editingCandidateId === cand.id ? (
                                  <div className="flex items-center space-x-1.5">
                                    <input
                                      type="text"
                                      value={editPhone}
                                      onChange={(e) => setEditPhone(e.target.value)}
                                      className="bg-gray-950 border border-gray-800 rounded px-2 py-0.5 text-xs text-white w-32"
                                    />
                                    <button 
                                      onClick={() => saveEditCandidate(cand.id)}
                                      className="p-1 rounded bg-green-600 text-white"
                                      title="Save"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-xs font-mono text-gray-300">{cand.mobile_number}</span>
                                    <button
                                      onClick={() => startEditCandidate(cand)}
                                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                                      title="Edit details/phone to call yourself"
                                    >
                                      Edit Number
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTREACH DASHBOARD WORKSPACE */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <PhoneCall className="w-5 h-5 text-indigo-400" />
                    Reachout Communications Queue
                  </h2>
                  <p className="text-xs text-gray-400">Real-time status updates of active candidate voice calls</p>
                </div>
                <button
                  onClick={fetchCallLogs}
                  disabled={loadingCalls}
                  className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs text-gray-300 hover:text-white transition flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCalls ? "animate-spin" : ""}`} />
                  <span>Sync Call States</span>
                </button>
              </div>

              {callLogs.length === 0 ? (
                <div className="glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="bg-gray-900 p-4 rounded-full border border-gray-800 text-gray-600">
                    <PhoneCall className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No Outbound Calls Triggered Yet</h4>
                    <p className="text-xs text-gray-500 max-w-sm mt-1 mx-auto">
                      Go to the <strong>Search & Reachout</strong> tab, search candidates, select them, and trigger call campaigns.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {callLogs.map((log) => {
                    const isExpanded = expandedCallId === log.id;
                    return (
                      <div 
                        key={log.id} 
                        className={`glass-panel overflow-hidden border transition-all ${
                          isExpanded ? "border-indigo-500/40 bg-gray-900/60" : "hover:border-gray-700"
                        }`}
                      >
                        <div 
                          onClick={() => setExpandedCallId(isExpanded ? null : log.id)}
                          className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`p-2.5 rounded-lg border ${
                              log.status === "COMPLETED" 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : log.status === "FAILED" || log.status === "CANCELLED"
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 status-active-pulse"
                            }`}>
                              <Phone className="w-5 h-5" />
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-bold text-white">{log.callee_name}</h3>
                                <span className="text-xs font-mono text-gray-500">{log.mobile_number}</span>
                              </div>
                              <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-400">
                                <span className="font-semibold text-gray-300">{log.agent_name || "Voice Recruiter"}</span>
                                <span>•</span>
                                <span className="flex items-center">
                                  <Clock className="w-3.5 h-3.5 text-gray-600 mr-1" />
                                  {log.duration_seconds > 0 ? `${Math.round(log.duration_seconds)}s` : "0.0s"}
                                </span>
                                <span>•</span>
                                <span>Created {new Date(log.created_at).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {/* Answered by / Engagement tags */}
                            {log.status === "COMPLETED" && (
                              <div className="hidden sm:flex items-center space-x-1.5">
                                <span className="text-[10px] bg-gray-900 border border-gray-800 text-gray-400 px-2 py-0.5 rounded">
                                  Answered: {log.answered_by || "HUMAN"}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                  log.engagement_status === "ENGAGED"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                }`}>
                                  {log.engagement_status || "NOT_ENGAGED"}
                                </span>
                              </div>
                            )}

                            {/* Call status badge */}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              log.status === "COMPLETED"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : log.status === "FAILED" || log.status === "CANCELLED"
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold"
                            }`}>
                              {log.status}
                            </span>
                            
                            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${
                              isExpanded ? "transform rotate-90 text-indigo-400" : ""
                            }`} />
                          </div>
                        </div>

                        {/* Collapsible details drawer */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-3 border-t border-gray-800 bg-gray-950/40 space-y-4">
                            {/* Call Recording Player */}
                            {log.recording_url ? (
                              <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between gap-4">
                                <div className="flex items-center space-x-2 text-xs text-gray-300">
                                  <Volume2 className="w-4 h-4 text-indigo-400" />
                                  <span>Audio Call Recording Available</span>
                                </div>
                                <audio controls className="w-full max-w-md h-8 text-xs">
                                  <source src={log.recording_url} type="audio/mp3" />
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            ) : (
                              <div className="p-3 text-xs text-gray-500 rounded bg-gray-900/50 italic">
                                {log.status === "COMPLETED" 
                                  ? "Audio recording processing..."
                                  : "Recording will be available once the call completes."}
                              </div>
                            )}

                            {/* Structured Results Display */}
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Structured Conversation Analysis</h4>
                              {log.result ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(log.result).map(([key, val]: [string, any]) => {
                                    // Make key pretty
                                    const prettyKey = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                                    const isPositive = val === true || val === "Yes" || val === "true";
                                    const isNegative = val === false || val === "No" || val === "false";
                                    
                                    return (
                                      <div key={key} className="p-3 rounded-lg bg-gray-900 border border-gray-850 flex flex-col justify-between">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{prettyKey}</span>
                                        <span className={`text-sm mt-1.5 font-medium ${
                                          isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-gray-200"
                                        }`}>
                                          {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-4 text-center rounded-lg bg-gray-900/40 border border-gray-800 text-gray-500 text-xs italic">
                                  {log.status === "COMPLETED" 
                                    ? "Extracting results schema..."
                                    : "Conversational parameters will be extracted upon completion."}
                                </div>
                              )}
                            </div>

                            {/* Raw Call Metadata JSON */}
                            <div>
                              <details className="text-xs text-gray-500">
                                <summary className="cursor-pointer hover:text-gray-300 select-none">View Call Variables & Metadata JSON</summary>
                                <pre className="mt-2 p-3 bg-black/60 border border-gray-850 rounded text-[10px] text-gray-400 overflow-x-auto">
                                  {JSON.stringify({
                                    call_id: log.id,
                                    agent_id: log.agent_id,
                                    request_id: log.request_id,
                                    custom_data: log.custom_data,
                                    created_at: log.created_at,
                                    updated_at: log.updated_at
                                  }, null, 2)}
                                </pre>
                              </details>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AGENTS REGISTERED WORKSPACE */}
          {activeTab === "agents" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-400" />
                    Voice Agent Registry
                  </h2>
                  <p className="text-xs text-gray-400">Configure and register Hunar.AI voice calling agents</p>
                </div>

                <button
                  onClick={() => setShowCreateAgentForm(!showCreateAgentForm)}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showCreateAgentForm ? "Hide Form" : "Create New Agent"}</span>
                </button>
              </div>

              {/* Create Agent Form Banner */}
              {agentCreationMsg && (
                <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
                  agentCreationMsg.error ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-green-500/10 border-green-500/20 text-green-300"
                }`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider">
                      {agentCreationMsg.error ? "Error Creating Agent" : "Success"}
                    </h5>
                    <p className="text-sm mt-0.5">{agentCreationMsg.text}</p>
                  </div>
                </div>
              )}

              {/* Create Agent Form */}
              {showCreateAgentForm && (
                <div className="glass-panel p-6 space-y-4 border-indigo-500/30">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Register Outbound Voice Agent</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Agent Name</label>
                      <input 
                        type="text"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Voice Persona</label>
                      <select 
                        value={newAgent.voice_persona}
                        onChange={(e) => setNewAgent({ ...newAgent, voice_persona: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      >
                        <option value="NEHA">NEHA (Female Accent)</option>
                        <option value="ROY">ROY (Male Accent)</option>
                        <option value="ZOE">ZOE (US Female)</option>
                        <option value="SAM">SAM (US Male)</option>
                        <option value="MIRA">MIRA (UK Female)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Persona Call Name</label>
                      <input 
                        type="text"
                        value={newAgent.persona_name}
                        onChange={(e) => setNewAgent({ ...newAgent, persona_name: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Language</label>
                      <select 
                        value={newAgent.language}
                        onChange={(e) => setNewAgent({ ...newAgent, language: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      >
                        <option value="ENGLISH">ENGLISH</option>
                        <option value="HINDI">HINDI</option>
                        <option value="TAMIL">TAMIL</option>
                        <option value="TELUGU">TELUGU</option>
                        <option value="SPANISH">SPANISH</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-gray-400 font-semibold">Business Objective Description</label>
                      <input 
                        type="text"
                        value={newAgent.objective}
                        onChange={(e) => setNewAgent({ ...newAgent, objective: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-gray-400 font-semibold">System prompt / Persona instructions</label>
                      <textarea 
                        rows={3}
                        value={newAgent.agent_prompt}
                        onChange={(e) => setNewAgent({ ...newAgent, agent_prompt: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-gray-400 font-semibold">Introduction Call Greeting</label>
                      <input 
                        type="text"
                        value={newAgent.introduction}
                        onChange={(e) => setNewAgent({ ...newAgent, introduction: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-gray-400 font-semibold">Result Extraction instructions</label>
                      <input 
                        type="text"
                        value={newAgent.result_prompt}
                        onChange={(e) => setNewAgent({ ...newAgent, result_prompt: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-gray-400 font-semibold">Result Data Schema (JSON Schema Object)</label>
                      <textarea 
                        rows={4}
                        value={newAgent.result_schema_str}
                        onChange={(e) => setNewAgent({ ...newAgent, result_schema_str: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => setShowCreateAgentForm(false)}
                      className="px-4 py-2 border border-gray-800 hover:bg-gray-900 rounded text-xs text-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAgent}
                      disabled={creatingAgent}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white font-bold disabled:opacity-50"
                    >
                      {creatingAgent ? "Registering agent..." : "Register Agent"}
                    </button>
                  </div>
                </div>
              )}

              {/* LIST REGISTRY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {agents.map((ag) => (
                  <div key={ag.id} className="glass-panel p-5 space-y-4 hover:border-indigo-500/20 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400">
                          {ag.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{ag.name}</h3>
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono mt-1 inline-block">
                            ID: {ag.id}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs bg-gray-900 border border-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        {ag.voice_persona} ({ag.persona_name})
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 italic">{ag.summary || "No description provided."}</p>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-850 pt-3">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Required Input Variables</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ag.custom_variables && ag.custom_variables.length > 0 ? (
                            ag.custom_variables.map((v: string) => (
                              <span key={v} className="text-[9px] bg-gray-950 border border-gray-850 px-1.5 py-0.5 rounded text-indigo-300 font-mono">
                                {v}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] text-gray-600">None required (Uses core variables)</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Result Variables</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ag.result_variables && ag.result_variables.length > 0 ? (
                            ag.result_variables.map((v: string) => (
                              <span key={v} className="text-[9px] bg-gray-950 border border-gray-850 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
                                {v}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] text-gray-600">Dynamic extraction keys</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SMART ATTENDANCE WORKSPACE */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              
              {/* Solution architecture overview */}
              <div className="glass-panel p-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                  Conceptual Solution: Attendance Tracking Without Smartphones
                </h2>
                
                <div className="prose prose-invert max-w-none text-sm text-gray-300 space-y-3">
                  <p>
                    <strong>The Challenge:</strong> Track attendance of 1,000 employees every day across 100 locations (10 employees per site) under the constraint that <em>no mobile applications or smartphones exist</em>, but <strong>centralized LLMs, cloud databases, landlines, and SMS gateways are fully operational</strong>.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2 p-4 rounded-lg bg-gray-950/60 border border-gray-800">
                      <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">1. Geofenced IVR Voice Gateway</h4>
                      <p className="text-xs text-gray-400">
                        Each of the 100 locations is equipped with a registered landline telephone or GSM desk phone gateway. Employees check-in by dialing a toll-free number from the physical site phone. Location is 100% verified via telecom-level <strong>Caller Line Identification (CLI) Geofencing</strong>.
                      </p>
                    </div>

                    <div className="space-y-2 p-4 rounded-lg bg-gray-950/60 border border-gray-800">
                      <h4 className="text-xs font-bold uppercase text-cyan-400 tracking-wider">2. Voice Biometrics & VUI LLM Verification</h4>
                      <p className="text-xs text-gray-400">
                        An LLM-driven IVR voice agent answers the call. The employee states their name and ID. A <strong>Voiceprint Biometrics model</strong> verifies identity. The LLM transcribes, matches credentials, checks a site-specific physical dynamic code token, and updates the database.
                      </p>
                    </div>
                  </div>

                  {/* Mermaid SVG Diagram */}
                  <div className="p-4 rounded-lg bg-gray-950 border border-gray-850 flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Check-in Architecture Flow</span>
                    <svg className="w-full max-w-2xl h-auto" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Nodes */}
                      <rect x="20" y="60" width="130" height="60" rx="6" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
                      <text x="85" y="95" fill="#c7d2fe" fontSize="11" fontWeight="bold" textAnchor="middle">1. Employee Calls IVR</text>
                      <text x="85" y="110" fill="#94a3b8" fontSize="9" textAnchor="middle">from Site Landline</text>

                      <rect x="210" y="60" width="130" height="60" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <text x="275" y="95" fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle">2. Telecom CLI Check</text>
                      <text x="275" y="110" fill="#94a3b8" fontSize="9" textAnchor="middle">Landline Caller ID</text>

                      <rect x="400" y="60" width="150" height="60" rx="6" fill="#111827" stroke="#0891b2" strokeWidth="1.5" />
                      <text x="475" y="90" fill="#c5f2f7" fontSize="11" fontWeight="bold" textAnchor="middle">3. Voice Biometrics</text>
                      <text x="475" y="105" fill="#c5f2f7" fontSize="11" fontWeight="bold" textAnchor="middle">& Daily Passcode Verification</text>

                      <rect x="610" y="60" width="160" height="60" rx="6" fill="#022c22" stroke="#059669" strokeWidth="1.5" />
                      <text x="690" y="95" fill="#d1fae5" fontSize="11" fontWeight="bold" textAnchor="middle">4. LLM Validates & Logs</text>
                      <text x="690" y="110" fill="#34d399" fontSize="9" textAnchor="middle">Attendance Logged (SQLite)</text>

                      {/* Arrows */}
                      <path d="M 150 90 L 210 90" stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrow)" />
                      <path d="M 340 90 L 400 90" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrow)" />
                      <path d="M 550 90 L 610 90" stroke="#0891b2" strokeWidth="1.5" markerEnd="url(#arrow)" />

                      {/* Arrow marker definition */}
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                        </marker>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>

              {/* ATTENDANCE INTERACTIVE SIMULATOR */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Simulator Control Board */}
                <div className="glass-panel p-5 space-y-4 lg:col-span-1 border-indigo-500/20">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">IVR Gateway Simulator</h3>
                  <p className="text-xs text-gray-400">Trigger simulated voice/SMS calls from site employees to see the verification engine in action.</p>
                  
                  <div className="space-y-3">
                    {/* Employee Profile Selector */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Select Employee Profile</label>
                      <select 
                        onChange={(e) => handleSelectSimEmployee(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-white"
                      >
                        {simulatedEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                        ))}
                      </select>
                    </div>

                    {/* Site Information Display */}
                    <div className="p-3 rounded bg-gray-950/60 border border-gray-850 text-xs space-y-1 text-gray-300">
                      <div><span className="text-gray-500">Site Assignment:</span> {simEmployee.location_name} ({simEmployee.location_id})</div>
                      <div><span className="text-gray-500">Allowed Landline Range:</span> +91-11-234XXXXX</div>
                      <div><span className="text-gray-500">Required Dynamic Passcode:</span> 4821</div>
                    </div>

                    {/* Channel Selector */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Simulated Gateway Channel</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Voice IVR", "SMS Check-in"].map(chan => (
                          <button
                            key={chan}
                            onClick={() => setSimChannel(chan as any)}
                            className={`py-1.5 rounded text-xs font-semibold border ${
                              simChannel === chan 
                                ? "bg-indigo-600 border-indigo-500 text-white" 
                                : "bg-gray-950 border-gray-850 text-gray-400 hover:text-white"
                            }`}
                          >
                            {chan}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transcript Input */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Simulated Call Transcript / Message Body</label>
                      <textarea
                        rows={3}
                        value={simEmployee.message}
                        onChange={(e) => setSimEmployee({ ...simEmployee, message: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-850 rounded p-2 text-xs text-white font-mono"
                        placeholder="Provide check-in details..."
                      />
                    </div>

                    <button
                      onClick={handleSimulateAttendance}
                      disabled={simulatingAttendance}
                      className="w-full py-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      {simulatingAttendance ? "Verifying check-in..." : "Place Simulated Check-in"}
                    </button>
                  </div>
                </div>

                {/* Simulation Logs & Live Result */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Live Simulation Response Output */}
                  {simResult && (
                    <div className="glass-panel p-5 space-y-3 border-emerald-500/20 bg-emerald-950/5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Gateway Verification Result</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          simResult.status === "PRESENT" 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        }`}>
                          {simResult.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-2.5 rounded bg-gray-950 border border-gray-900">
                          <span className="text-gray-500 block">Caller Line CLI:</span>
                          <span className="font-mono text-gray-200 mt-1 inline-block">{simResult.caller_id}</span>
                        </div>
                        <div className="p-2.5 rounded bg-gray-950 border border-gray-900">
                          <span className="text-gray-500 block">Voice Biometric Status:</span>
                          <span className="text-emerald-400 mt-1 inline-block font-semibold">Matched (97.4%)</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-300 bg-gray-950 border border-gray-900 p-2.5 rounded leading-relaxed">
                        <strong>LLM Analysis:</strong> {simResult.details}
                      </p>
                    </div>
                  )}

                  {/* Attendance Log Table */}
                  <div className="glass-panel overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Location Check-in Log (1,000 Employees)</h4>
                      <button 
                        onClick={fetchAttendanceLogs}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Refresh Logs
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-950/40 text-gray-500 font-bold border-b border-gray-850 uppercase tracking-wider">
                            <th className="p-3">Employee</th>
                            <th className="p-3">Location Site</th>
                            <th className="p-3">Timestamp</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Verification Details</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850">
                          {attendanceLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-900/20">
                              <td className="p-3">
                                <div className="font-bold text-white">{log.employee_name}</div>
                                <div className="text-[10px] text-gray-500">{log.employee_id}</div>
                              </td>
                              <td className="p-3">
                                <div>{log.location_name}</div>
                                <span className="text-[9px] bg-gray-900 text-gray-400 px-1 py-0.5 rounded font-mono">{log.location_id}</span>
                              </td>
                              <td className="p-3 text-gray-400">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="p-3 text-indigo-300 font-medium">
                                {log.verification_type.split(" ")[0]}
                              </td>
                              <td className="p-3 text-gray-400 max-w-xs truncate" title={log.verification_details}>
                                {log.verification_details}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  log.status === "PRESENT"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* --- OUTREACH DYNAMIC CONFIGURATION MODAL --- */}
      {showOutreachModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg overflow-hidden border-indigo-500/40 bg-gray-950">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/30">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-indigo-400" />
                Configure Voice Campaign
              </h3>
              <button 
                onClick={() => { setShowOutreachModal(false); setOutreachResult(null); }}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-gray-400">
                You are initiating outreach calls to <strong>{candidates.filter(c => selectedCandidateIds.includes(c.id)).map(c => c.name).join(", ")}</strong>.
              </p>

              {/* Select Agent dropdown */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Select Voice Agent</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-white"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>{ag.name} ({ag.voice_persona})</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Variables from selected agent */}
              {Object.keys(agentVariables).length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-850">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Dynamic Prompt Variables</span>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(agentVariables).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs text-gray-300 font-semibold capitalize">
                          {key.replace(/_/g, " ")}
                        </label>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setAgentVariables({ ...agentVariables, [key]: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outreachResult && (
                <div className={`p-4 rounded border text-xs leading-relaxed ${
                  outreachResult.success 
                    ? "bg-green-500/10 border-green-500/20 text-green-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                }`}>
                  {outreachResult.message}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-850 flex justify-end space-x-2 bg-gray-900/10">
              <button
                onClick={() => { setShowOutreachModal(false); setOutreachResult(null); }}
                className="px-4 py-2 border border-gray-800 hover:bg-gray-900 rounded text-xs text-gray-400"
                disabled={triggeringOutreach}
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerOutreach}
                disabled={triggeringOutreach}
                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded text-xs font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                {triggeringOutreach ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Placing call(s)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Trigger Outreach</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
