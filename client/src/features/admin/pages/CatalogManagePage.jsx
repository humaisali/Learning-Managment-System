import { useState, useEffect } from "react";
import { Folder, Book, Bookmark, Layers, Plus, Edit2, Check, X, Trash2, GraduationCap, Code } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

export default function CatalogManagePage() {
  const [activeTab, setActiveTab] = useState("curriculum");
  
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [topics, setTopics] = useState([]);

  // Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, mode: 'create', data: null });
  const [formData, setFormData] = useState({ name: '', title: '', description: '', sortOrder: 1 });

  useEffect(() => { fetchBoards(); }, []);

  const fetchBoards = async () => {
    try {
      const res = await api.get("/catalog/boards");
      setBoards(res.data.data);
    } catch { toast.error("Failed to load boards"); }
  };

  const fetchClasses = async (boardId) => {
    try {
      const res = await api.get(`/catalog/boards/${boardId}/classes`);
      setClasses(res.data.data);
    } catch { toast.error("Failed to load classes"); }
  };

  const fetchSubjects = async (classId) => {
    try {
      const res = await api.get(`/catalog/classes/${classId}/subjects`);
      setSubjects(res.data.data);
    } catch { toast.error("Failed to load subjects"); }
  };

  const fetchTopics = async (subjectId) => {
    try {
      const res = await api.get(`/catalog/subjects/${subjectId}/topics`);
      setTopics(res.data.data);
    } catch { toast.error("Failed to load topics"); }
  };

  const handleBoardSelect = (board) => {
    setSelectedBoard(board); setSelectedClass(null); setSelectedSubject(null);
    setClasses([]); setSubjects([]); setTopics([]);
    fetchClasses(board.id || board._id);
  };

  const handleClassSelect = (cls) => {
    setSelectedClass(cls); setSelectedSubject(null);
    setSubjects([]); setTopics([]);
    fetchSubjects(cls.id || cls._id);
  };

  const handleSubjectSelect = (sub) => {
    setSelectedSubject(sub); setTopics([]);
    fetchTopics(sub.id || sub._id);
  };

  // --- CRUD Operations ---
  const openModal = (type, mode = 'create', data = null) => {
    setModalConfig({ isOpen: true, type, mode, data });
    if (mode === 'edit' && data) {
      setFormData({ name: data.name || '', title: data.title || '', description: data.description || '', sortOrder: data.sortOrder || 1 });
    } else {
      setFormData({ name: '', title: '', description: '', sortOrder: 1 });
    }
  };

  const closeModal = () => setModalConfig({ isOpen: false, type: null, mode: 'create', data: null });

  const handleSave = async () => {
    const { type, mode, data } = modalConfig;
    const isEdit = mode === 'edit';
    const endpointMap = {
      'board': isEdit ? `/catalog/boards/${data._id || data.id}` : `/catalog/boards`,
      'class': isEdit ? `/catalog/classes/${data._id || data.id}` : `/catalog/classes`,
      'subject': isEdit ? `/catalog/subjects/${data._id || data.id}` : `/catalog/subjects`,
      'topic': isEdit ? `/catalog/topics/${data._id || data.id}` : `/catalog/topics`,
    };

    const payloadMap = {
      'board': { name: formData.name, description: formData.description, sortOrder: Number(formData.sortOrder) },
      'class': { name: formData.name, boardId: selectedBoard?._id || selectedBoard?.id, sortOrder: Number(formData.sortOrder) },
      'subject': { name: formData.name, classId: selectedClass?._id || selectedClass?.id, sortOrder: Number(formData.sortOrder) },
      'topic': { title: formData.title, subjectId: selectedSubject?._id || selectedSubject?.id, sortOrder: Number(formData.sortOrder) },
    };

    try {
      const url = endpointMap[type];
      const payload = payloadMap[type];
      
      if (isEdit) {
        await api.put(url, payload);
        toast.success(`${type} updated successfully`);
      } else {
        await api.post(url, payload);
        toast.success(`${type} created successfully`);
      }

      closeModal();
      
      // Refresh relevant column
      if (type === 'board') fetchBoards();
      if (type === 'class') fetchClasses(selectedBoard._id || selectedBoard.id);
      if (type === 'subject') fetchSubjects(selectedClass._id || selectedClass.id);
      if (type === 'topic') fetchTopics(selectedSubject._id || selectedSubject.id);

    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to save ${type}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Catalog Management</h1>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'curriculum' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('curriculum')}
        >
          <GraduationCap className="h-4 w-4" /> Curriculum Based
        </button>
        <button
          className={`px-4 py-2 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'skills' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('skills')}
        >
          <Code className="h-4 w-4" /> Skill Based (Programs)
        </button>
      </div>

      {activeTab === 'curriculum' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-200px)] min-h-[600px]">
          {/* Boards Column */}
          <div className="flex flex-col border rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b font-semibold text-sm text-gray-700 flex justify-between items-center">
              Boards
              <button onClick={() => openModal('board')} className="text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {boards.map(b => (
                <div 
                  key={b._id || b.id} 
                  className={`flex justify-between items-center p-2 text-sm rounded cursor-pointer transition-colors ${selectedBoard?._id === (b._id || b.id) ? 'bg-primary-50 text-primary-700 font-medium border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}
                  onClick={() => handleBoardSelect(b)}
                >
                  <span className="truncate">{b.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); openModal('board', 'edit', b); }} className="text-gray-400 hover:text-gray-600"><Edit2 className="h-3 w-3" /></button>
                </div>
              ))}
              {boards.length === 0 && <div className="p-4 text-center text-xs text-gray-400">No boards found</div>}
            </div>
          </div>

          {/* Classes Column */}
          <div className="flex flex-col border rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b font-semibold text-sm text-gray-700 flex justify-between items-center">
              Classes
              {selectedBoard && <button onClick={() => openModal('class')} className="text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded"><Plus className="h-4 w-4" /></button>}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!selectedBoard ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">Select a board first</div>
              ) : classes.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">No classes found</div>
              ) : classes.map(c => (
                <div 
                  key={c._id || c.id} 
                  className={`flex justify-between items-center p-2 text-sm rounded cursor-pointer transition-colors ${selectedClass?._id === (c._id || c.id) ? 'bg-primary-50 text-primary-700 font-medium border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}
                  onClick={() => handleClassSelect(c)}
                >
                  <span className="truncate">{c.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); openModal('class', 'edit', c); }} className="text-gray-400 hover:text-gray-600"><Edit2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects Column */}
          <div className="flex flex-col border rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b font-semibold text-sm text-gray-700 flex justify-between items-center">
              Subjects
              {selectedClass && <button onClick={() => openModal('subject')} className="text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded"><Plus className="h-4 w-4" /></button>}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!selectedClass ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">Select a class first</div>
              ) : subjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">No subjects found</div>
              ) : subjects.map(s => (
                <div 
                  key={s._id || s.id} 
                  className={`flex justify-between items-center p-2 text-sm rounded cursor-pointer transition-colors ${selectedSubject?._id === (s._id || s.id) ? 'bg-primary-50 text-primary-700 font-medium border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}
                  onClick={() => handleSubjectSelect(s)}
                >
                  <span className="truncate">{s.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); openModal('subject', 'edit', s); }} className="text-gray-400 hover:text-gray-600"><Edit2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Topics Column */}
          <div className="flex flex-col border rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b font-semibold text-sm text-gray-700 flex justify-between items-center">
              Topics
              {selectedSubject && <button onClick={() => openModal('topic')} className="text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded"><Plus className="h-4 w-4" /></button>}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!selectedSubject ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">Select a subject first</div>
              ) : topics.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">No topics found</div>
              ) : topics.map(t => (
                <div 
                  key={t._id || t.id} 
                  className="flex justify-between items-center p-2 text-sm rounded border border-gray-100 hover:bg-gray-50"
                >
                  <span className="truncate pr-2">{t.sortOrder}. {t.title}</span>
                  <button onClick={(e) => { e.stopPropagation(); openModal('topic', 'edit', t); }} className="text-gray-400 hover:text-gray-600 shrink-0"><Edit2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit */}
      <Modal 
        isOpen={modalConfig.isOpen} 
        onClose={closeModal} 
        title={`${modalConfig.mode === 'create' ? 'Add' : 'Edit'} ${modalConfig.type?.charAt(0).toUpperCase() + modalConfig.type?.slice(1)}`}
      >
        <div className="space-y-4">
          {modalConfig.type === 'topic' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic Title</label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Newton's First Law" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={`e.g. ${modalConfig.type === 'board' ? 'Federal Board' : modalConfig.type === 'class' ? 'Class 9' : 'Physics'}`} />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <Input type="number" value={formData.sortOrder} onChange={(e) => setFormData({...formData, sortOrder: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
