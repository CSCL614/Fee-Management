import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  XCircle, ArrowRight, RotateCcw, ShieldCheck, Check, Info, FileText,
  AlertCircle, Users, ExternalLink, RefreshCw, ChevronRight, HelpCircle, Sparkles
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { pageVariants, fadeInUp } from '../utils/animations';

export default function ImportStudentsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Workflow states: 'upload' | 'previewing' | 'preview' | 'importing' | 'result'
  const [step, setStep] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState('valid_only'); // 'valid_only' | 'all_or_nothing'
  const [importPayments, setImportPayments] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // Preview data
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'valid' | 'duplicate' | 'invalid' | 'discrepancy'
  const [searchFilter, setSearchFilter] = useState('');

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Result data
  const [importResult, setImportResult] = useState(null);

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Generating template...', { id: 'template-dl' });
      const res = await api.get('/imports/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'college_admin_student_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Excel template downloaded', { id: 'template-dl' });
    } catch (err) {
      console.error('Download template error:', err);
      toast.error('Failed to download template. Please verify admin privileges.', { id: 'template-dl' });
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    if (!isXlsx) {
      toast.error('Only Excel files (.xlsx, .xls) are supported');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 10 MB');
      return;
    }
    setSelectedFile(file);
  };

  // Preview Uploaded Excel
  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error('Please select an Excel file to preview');
      return;
    }

    setStep('previewing');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setPreviewData(res.data.data);
        setStep('preview');
        toast.success(`Parsed ${res.data.data.totalRows} student records from sheet "${res.data.data.sheetName}"`);
      } else {
        toast.error(res.data.message || 'Failed to preview Excel file');
        setStep('upload');
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(err.response?.data?.message || 'Error parsing workbook. Please check file format.');
      setStep('upload');
    }
  };

  // Revalidate without file re-upload
  const handleRevalidate = async () => {
    if (!selectedFile) return;
    setIsRevalidating(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setPreviewData(res.data.data);
        toast.success(`Revalidation complete: ${res.data.data.validCount} valid, ${res.data.data.discrepancyCount} discrepancy notes.`);
      } else {
        toast.error(res.data.message || 'Revalidation failed');
      }
    } catch (err) {
      console.error('Revalidation error:', err);
      toast.error('Revalidation failed. Please check backend connection.');
    } finally {
      setIsRevalidating(false);
    }
  };

  // Quick Seed Demo Fee Structures and Revalidate
  const handleQuickSeedDemoStructures = async () => {
    try {
      toast.loading('Configuring 89 demo fee structures for AY 2026–27...', { id: 'quick-demo' });
      await api.post('/fees/demo-structures', { academicYear: '2026-27' });
      toast.success('Configured demo fee structures for all 5 courses!', { id: 'quick-demo' });
      await handleRevalidate();
    } catch (err) {
      console.error('Quick seed demo error:', err);
      toast.error('Failed to configure demo fee structures', { id: 'quick-demo' });
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    setShowConfirmModal(false);
    setStep('importing');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', importMode);
    formData.append('importPayments', importPayments);

    try {
      const res = await api.post('/imports/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setImportResult(res.data.data);
        setStep('result');
        toast.success(res.data.message || 'Students imported successfully!');
      } else {
        toast.error(res.data.message || 'Import failed');
        setStep('preview');
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error(err.response?.data?.message || 'Server error while executing student import');
      setStep('preview');
    }
  };

  // Cancel / Reset
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setActiveTab('all');
    setSearchFilter('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast('Import cancelled. No changes made.', { icon: 'ℹ️' });
  };

  // Filtered rows for preview table
  const filteredRecords = (previewData?.records || []).filter(item => {
    if (activeTab === 'valid' && item.status !== 'valid') return false;
    if (activeTab === 'duplicate' && item.status !== 'duplicate') return false;
    if (activeTab === 'invalid' && item.status !== 'invalid') return false;
    if (activeTab === 'discrepancy' && item.warnings.length === 0) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchAdm = item.data.admissionNo.toLowerCase().includes(q);
      const matchName = item.data.name.toLowerCase().includes(q);
      const matchCourse = (item.data.degree + ' ' + item.data.specialization).toLowerCase().includes(q);
      return matchAdm || matchName || matchCourse;
    }
    return true;
  });

  return (
    <div>
      <Topbar title="Import Students from Excel" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
      >
        {/* Breadcrumb & Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span onClick={() => navigate('/dashboard')} className="hover:text-blue-600 cursor-pointer">Dashboard</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span onClick={() => navigate('/students')} className="hover:text-blue-600 cursor-pointer">Students</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-900 font-bold">Excel Import</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Admin Excel Import Module
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Batch enroll students and map fee assessments directly from single-sheet Excel workbooks.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download Template</span>
            </button>
            <button
              onClick={() => navigate('/fee-structure')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 transition-colors cursor-pointer"
            >
              <span>Fee Structures</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* STEP 1: UPLOAD & CONFIGURATION */}
        {step === 'upload' && (
          <motion.div variants={fadeInUp} className="space-y-6">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all bg-white ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/40 shadow-lg scale-[1.005]'
                  : 'border-slate-200 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-file-input"
              />

              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Upload Student & Fee Excel Sheet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Drag and drop your <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]">.xlsx</code> file here, or browse your local files.
                  </p>
                </div>

                {selectedFile ? (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB · Ready to preview
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-1 hover:bg-emerald-100 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="excel-file-input"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Browse Excel File</span>
                  </label>
                )}

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>Supports single-sheet .xlsx</span>
                  <span>•</span>
                  <span>Max size: 10 MB</span>
                  <span>•</span>
                  <span>All 26 standard columns mapped</span>
                </div>
              </div>
            </div>

            {/* Import Configuration Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Validation Enforcement Policy */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Import Mode & Policy
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Select how system should handle rows with validation errors or duplicate admission numbers:
                </p>

                <div className="space-y-2.5 pt-1">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      importMode === 'valid_only'
                        ? 'border-blue-500 bg-blue-50/40 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50/80 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="valid_only"
                      checked={importMode === 'valid_only'}
                      onChange={() => setImportMode('valid_only')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>Import Valid Records Only</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">Recommended</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Imports all valid student rows. Duplicates and invalid rows are safely skipped and reported in the summary.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      importMode === 'all_or_nothing'
                        ? 'border-blue-500 bg-blue-50/40 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50/80 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="all_or_nothing"
                      checked={importMode === 'all_or_nothing'}
                      onChange={() => setImportMode('all_or_nothing')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>All-or-Nothing Import</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">Strict</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Import is completely aborted if ANY row contains validation errors or duplicate admission numbers.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Historical Payment Separation Policy */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Payment Separation Rule
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Per college accounting guidelines, student commitments are separated from receipts:
                </p>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>MongoDB calculates pending balance from Fee Structure assessments vs actual payments.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Excel "Total Fees" and "Pending Balance" are treated as comparison reference values.</span>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importPayments}
                    onChange={(e) => setImportPayments(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800">
                    Also import historical payments from "Total Paid" column
                  </span>
                </label>
              </div>

            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={!selectedFile}
                onClick={handlePreview}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                <span>Preview & Validate Records</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* LOADING SPINNER DURING PARSING */}
        {step === 'previewing' && (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4">
            <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Validating Excel Records Against Catalog...</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Checking courses, verifying student admission numbers, and comparing fee structures.
            </p>
          </div>
        )}

        {/* STEP 2: PREVIEW & VALIDATION REPORT */}
        {step === 'preview' && previewData && (
          <motion.div variants={fadeInUp} className="space-y-6">
            
            {/* KPI Badges Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Detected Rows</p>
                <p className="text-2xl font-bold text-slate-900 font-mono mt-1">{previewData.totalRows}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{previewData.filename}</p>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-200 p-4 bg-emerald-50/20 shadow-2xs">
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                </p>
                <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">{previewData.validCount}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Ready for import</p>
              </div>

              <div className="bg-white rounded-2xl border border-amber-200 p-4 bg-amber-50/20 shadow-2xs">
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Duplicates
                </p>
                <p className="text-2xl font-bold text-amber-700 font-mono mt-1">{previewData.duplicateCount}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Existing or internal</p>
              </div>

              <div className="bg-white rounded-2xl border border-rose-200 p-4 bg-rose-50/20 shadow-2xs">
                <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Invalid
                </p>
                <p className="text-2xl font-bold text-rose-700 font-mono mt-1">{previewData.invalidCount}</p>
                <p className="text-[10px] text-rose-600 mt-0.5">Missing / malformed</p>
              </div>

              <div className="bg-white rounded-2xl border border-sky-200 p-4 bg-sky-50/20 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Discrepancies
                </p>
                <p className="text-2xl font-bold text-sky-700 font-mono mt-1">{previewData.discrepancyCount}</p>
                <p className="text-[10px] text-sky-600 mt-0.5">Fee warnings</p>
              </div>
            </div>

            {/* Discrepancy & Verification Status Banner */}
            {previewData.discrepancyCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-bold">Fee Structure Discrepancies Detected ({previewData.discrepancyCount} rows):</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Some rows contain fee categories or amounts unconfigured in MongoDB for AY 2026–27. Per college accounting rules, <strong>no fabricated fee assessments are created</strong>. Balances will be derived strictly from official MongoDB fee demands and recorded payments.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={handleQuickSeedDemoStructures}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
                    title="Generate standard demo fee structures for AY 2026-27 and revalidate"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Demo Rates & Revalidate</span>
                  </button>
                  <button
                    onClick={() => navigate('/fee-structure')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Fee Structures</span>
                  </button>
                  <button
                    onClick={handleRevalidate}
                    disabled={isRevalidating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRevalidating ? 'animate-spin' : ''}`} />
                    <span>Revalidate</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-emerald-900 leading-relaxed">
                    <span className="font-bold">All Student Records & Fee Structures Verified:</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Every row maps cleanly to active MongoDB Fee Structures for AY 2026–27. Official fee demands will be automatically generated upon import.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={handleRevalidate}
                    disabled={isRevalidating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                    title="Re-run validation against database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRevalidating ? 'animate-spin' : ''}`} />
                    <span>{isRevalidating ? 'Revalidating...' : 'Revalidate Live'}</span>
                  </button>
                  <button
                    onClick={() => navigate('/fee-structure')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Fee Structures</span>
                  </button>
                </div>
              </div>
            )}

            {/* Table Filter Tabs & Search */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Records ({previewData.totalRows})
                  </button>
                  <button
                    onClick={() => setActiveTab('valid')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'valid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Valid Only ({previewData.validCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('duplicate')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'duplicate' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
                    }`}
                  >
                    Duplicates ({previewData.duplicateCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('invalid')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'invalid' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Invalid ({previewData.invalidCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('discrepancy')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'discrepancy' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-sky-700'
                    }`}
                  >
                    Discrepancies ({previewData.discrepancyCount})
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleRevalidate}
                    disabled={isRevalidating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    title="Revalidate preview against the latest MongoDB Fee Structures"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRevalidating ? 'animate-spin' : ''}`} />
                    <span>{isRevalidating ? 'Revalidating...' : 'Revalidate'}</span>
                  </button>

                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Filter preview rows..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto -mx-4 sm:mx-0 border-t border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3">Excel Row</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Course / Program</th>
                      <th className="py-2.5 px-3">Study Year</th>
                      <th className="py-2.5 px-3">Validation & Discrepancy Details</th>
                      <th className="py-2.5 px-3 text-right">Excel Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((item) => (
                      <tr
                        key={item.rowIndex}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          item.status === 'invalid'
                            ? 'bg-rose-50/30'
                            : item.status === 'duplicate'
                            ? 'bg-amber-50/30'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-500 text-[11px]">
                          #{item.rowIndex}
                        </td>
                        <td className="py-3 px-3">
                          {item.status === 'valid' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          )}
                          {item.status === 'duplicate' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              <AlertTriangle className="w-3 h-3" /> Duplicate
                            </span>
                          )}
                          {item.status === 'invalid' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                              <XCircle className="w-3 h-3" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {item.data.admissionNo || '—'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.data.name || '—'}
                          {item.data.fatherName && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              S/o {item.data.fatherName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {item.data.degree} {item.data.specialization}
                          <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                            {item.data.level}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                          {item.data.yearOfStudy} ({item.data.academicYear})
                        </td>
                        <td className="py-3 px-3 max-w-xs space-y-1">
                          {item.errors.map((err, ei) => (
                            <div key={ei} className="text-[11px] text-rose-600 font-medium flex items-start gap-1">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{err}</span>
                            </div>
                          ))}
                          {item.warnings.map((warn, wi) => (
                            <div key={wi} className="text-[11px] text-amber-700 font-normal flex items-start gap-1">
                              <span className="text-amber-500 font-bold">⚠</span>
                              <span>{warn}</span>
                            </div>
                          ))}
                          {item.errors.length === 0 && item.warnings.length === 0 && (
                            <div className="space-y-0.5">
                              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> All fields verified
                              </span>
                              {item.feeComparison?.matchingStructuresCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                                  Matched {item.feeComparison.matchingStructuresCount} demo terms ({formatCurrency(item.feeComparison.backendStructureTotal)})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          <div title="Excel Reference Total Fees">{formatCurrency(item.data.totalFees)}</div>
                          {item.feeComparison?.backendStructureTotal > 0 && (
                            <span className="block text-[10px] font-normal text-emerald-600" title="Configured Fee Assessment Demand">
                              Demand: {formatCurrency(item.feeComparison.backendStructureTotal)}
                            </span>
                          )}
                          <span className="block text-[10px] font-normal text-slate-400" title="Excel Reference Total Paid">
                            Paid: {formatCurrency(item.data.totalPaid)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredRecords.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No records found matching current tab / filter.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="text-xs text-slate-600">
                Mode: <strong className="text-slate-900">{importMode === 'valid_only' ? 'Import Valid Records Only' : 'All-or-Nothing'}</strong> · Ready to import <strong className="text-emerald-700">{previewData.validCount}</strong> records
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel Import
                </button>

                <button
                  disabled={importMode === 'all_or_nothing' && (previewData.invalidCount > 0 || previewData.duplicateCount > 0)}
                  onClick={() => setShowConfirmModal(true)}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  Confirm & Import ({previewData.validCount}) Students
                </button>
              </div>
            </div>

          </motion.div>
        )}

        {/* LOADING SPINNER DURING IMPORT */}
        {step === 'importing' && (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4">
            <div className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Enrolling Students & Assessing Demands...</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Creating MongoDB documents, assigning student IDs, and recording audit logs.
            </p>
          </div>
        )}

        {/* STEP 3: FINAL IMPORT SUMMARY */}
        {step === 'result' && importResult && (
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="bg-white rounded-3xl border border-emerald-200/80 p-6 sm:p-8 shadow-sm text-center max-w-2xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Import Completed Successfully</h2>
                <p className="text-xs text-slate-500 mt-1">
                  File <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-semibold">{importResult.filename}</code> has been processed and saved to MongoDB.
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Inserted</p>
                  <p className="text-2xl font-bold text-emerald-800 font-mono mt-0.5">{importResult.insertedCount}</p>
                  <p className="text-[10px] text-emerald-600">Students added</p>
                </div>

                <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Skipped Duplicates</p>
                  <p className="text-2xl font-bold text-amber-800 font-mono mt-0.5">{importResult.duplicateCount}</p>
                  <p className="text-[10px] text-amber-600">Already in DB</p>
                </div>

                <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100">
                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Failed / Invalid</p>
                  <p className="text-2xl font-bold text-rose-800 font-mono mt-0.5">{importResult.invalidCount}</p>
                  <p className="text-[10px] text-rose-600">Validation errors</p>
                </div>

                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Fee Demands</p>
                  <p className="text-2xl font-bold text-blue-800 font-mono mt-0.5">{importResult.feeDemandsCreated}</p>
                  <p className="text-[10px] text-blue-600">Assessed from catalog</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => navigate('/students')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>View Student Directory</span>
                </button>

                <button
                  onClick={() => navigate('/audit-log')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>View Audit Log</span>
                </button>

                <button
                  onClick={() => {
                    setStep('upload');
                    setSelectedFile(null);
                    setPreviewData(null);
                    setImportResult(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Import Another File</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* CONFIRMATION MODAL */}
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-900">Confirm Data Import</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You are about to insert <strong>{previewData?.validCount}</strong> verified student record(s) into MongoDB.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Target Academic Year:</span>
                    <strong className="text-slate-800">2026-27</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Import Policy:</span>
                    <strong className="text-slate-800">
                      {importMode === 'valid_only' ? 'Import Valid Only' : 'All-or-Nothing'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Fee Demand Generation:</span>
                    <strong className="text-emerald-700">Active Fee Structures</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Historical Payments:</span>
                    <strong className={importPayments ? 'text-amber-700' : 'text-slate-500'}>
                      {importPayments ? 'Yes (Receipts generated)' : 'Disabled (Summary only)'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                  >
                    Yes, Commit Import
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
