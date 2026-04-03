import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { Employee, Link, Resource, Product, Lead, AnalyticsEvent } from '../types';
import { motion } from 'motion/react';
import { 
  User, 
  Briefcase, 
  Phone, 
  Mail, 
  Info, 
  Camera, 
  Plus, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Video, 
  Package, 
  Users, 
  BarChart3, 
  LogOut,
  ChevronRight,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Github,
  Youtube,
  Share2,
  QrCode,
  Download,
  ShieldCheck,
  Eye,
  MousePointer2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'links' | 'resources' | 'products' | 'leads'>('profile');
  const [isUpdating, setIsUpdating] = useState(false);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const isSaving = useRef(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    about: '',
    slug: ''
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          navigate('/login');
          return;
        }

        // Fetch employee safely
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', authUser.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching employee:', error);
          setLoading(false);
          return;
        }

        if (!data) {
          console.log('No profile found');
          setEmployee(null);
          setLoading(false);
          return;
        }

        setEmployee(data as Employee);
        setProfileForm({
          name: data.name || '',
          designation: data.designation || '',
          phone: data.phone || '',
          email: data.email || '',
          about: data.about || '',
          slug: data.slug || ''
        });

        // Fetch related data
        const [linksRes, resourcesRes, productsRes, leadsRes, analyticsRes] = await Promise.all([
          supabase.from('links').select('*').eq('employee_id', data.id),
          supabase.from('resources').select('*').eq('employee_id', data.id),
          supabase.from('products').select('*').eq('employee_id', data.id),
          supabase.from('leads').select('*').eq('employee_id', data.id).order('created_at', { ascending: false }),
          supabase.from('analytics').select('*').eq('employee_id', data.id).order('created_at', { ascending: false })
        ]);

        if (linksRes.data) setLinks(linksRes.data as Link[]);
        if (resourcesRes.data) setResources(resourcesRes.data as Resource[]);
        if (productsRes.data) setProducts(productsRes.data as Product[]);
        if (leadsRes.data) setLeads(leadsRes.data.map(l => ({ ...l, timestamp: l.created_at })) as any);
        if (analyticsRes.data) setAnalytics(analyticsRes.data.map(a => ({ ...a, timestamp: a.created_at })) as any);

      } catch (err) {
        console.error("Error in fetchData:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => clearTimeout(timeout);
  }, [user, navigate]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving.current) return;
    isSaving.current = true;
    setIsUpdating(true);
    
    await new Promise(res => setTimeout(res, 300));
    const currentSlug = (profileForm.slug || profileForm.name)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    // Check if slug is unique if changed or if we're creating/upserting
    try {
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('slug', currentSlug)
        .neq('user_id', user.id)
        .single();
      
      if (existing) {
        toast.error('This URL slug is already taken. Please choose another one.');
        setIsUpdating(false);
        return;
      }
    } catch (err) {
      // PGRST116 is fine, it means slug is unique
    }

    try {
      const updateData = {
        user_id: user.id,
        name: profileForm.name || null,
        slug: currentSlug || null,
        email: profileForm.email || null,
        phone: profileForm.phone || null,
        designation: profileForm.designation || null,
        photo: employee?.photo || (profileForm.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.name)}&background=random` : null),
        about: profileForm.about || null,
        status: 'active'
      };

      console.log('Upserting profile data:', updateData);

      const { data, error } = await supabase
        .from('employees')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) throw error;
      
      setEmployee(data as Employee);
      setProfileForm({
        ...profileForm,
        slug: data.slug,
        name: data.name,
        email: data.email,
        phone: data.phone,
        designation: data.designation,
        about: data.about
      });
      toast.success('Profile saved successfully');
      console.log('Profile saved successfully:', data);
    } catch (err: any) {
      console.error('Save Profile Error:', err);
      toast.error('Something went wrong: ' + (err.message || 'Failed to save profile'));
    } finally {
      setIsUpdating(false);
      isSaving.current = false;
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || isSaving.current) return;
    isSaving.current = true;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      isSaving.current = false;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB.');
      isSaving.current = false;
      return;
    }

    // Show local preview
    const objectUrl = URL.createObjectURL(file);
    setLocalPhotoPreview(objectUrl);

    const loadingToast = toast.loading('Uploading photo...');

    try {
      await supabase.auth.getSession();
      await new Promise(res => setTimeout(res, 300));
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = fileName; 

      console.log('Uploading photo to avatars bucket:', filePath);

      // Upload to Supabase Storage (bucket: avatars)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        throw new Error('Image upload failed: ' + uploadError.message);
      }

      await new Promise(res => setTimeout(res, 300));

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Photo uploaded, public URL:', publicUrl);

      await new Promise(res => setTimeout(res, 300));

      // Update Database (upsert instead of update)
      const { data: updatedEmp, error: updateError } = await supabase
        .from('employees')
        .upsert({ 
          user_id: user.id,
          photo: publicUrl,
          name: profileForm.name || employee?.name || null,
          slug: profileForm.slug || employee?.slug || null,
          email: profileForm.email || employee?.email || user.email || null,
          status: 'active'
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (updateError) {
        console.error('Database Update Error:', updateError);
        throw new Error('Failed to update profile with new photo');
      }

      if (updatedEmp) {
        setEmployee(updatedEmp as Employee);
      }
      setLocalPhotoPreview(null); // Clear local preview after success
      toast.success('Image uploaded successfully', { id: loadingToast });
    } catch (err: any) {
      console.error('Photo Upload Error:', err);
      toast.error('Something went wrong: ' + (err.message || 'Error uploading photo'), { id: loadingToast });
      setLocalPhotoPreview(null); // Clear local preview on error
    } finally {
      isSaving.current = false;
    }
  };

  const addLink = async (type: string, url: string) => {
    if (!employee) return;
    const { data, error } = await supabase
      .from('links')
      .insert([{ employee_id: employee.id, type, url }])
      .select()
      .single();
    
    if (data) setLinks([...links, data as Link]);
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (!error) setLinks(links.filter(l => l.id !== id));
  };

  const addResource = async (type: 'pdf' | 'video', title: string, url: string) => {
    if (!employee) return;
    const { data, error } = await supabase
      .from('resources')
      .insert([{ employee_id: employee.id, type, title, file_url: url }])
      .select()
      .single();
    
    if (data) setResources([...resources, data as Resource]);
  };

  const addProduct = async (name: string, description: string, image: string) => {
    if (!employee) return;
    const { data, error } = await supabase
      .from('products')
      .insert([{ employee_id: employee.id, name, description, image }])
      .select()
      .single();
    
    if (data) setProducts([...products, data as Product]);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-neutral-500 font-medium animate-pulse">Loading your dashboard...</p>
    </div>
  );

  if (!employee && !loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-10 text-center border border-neutral-100">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <User className="text-blue-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Complete Your Profile</h2>
          <p className="text-neutral-500 mb-8">You haven't set up your digital card yet. Create your profile to get started.</p>
          <button 
            onClick={() => {
              setEmployee({ name: '' } as any); // Temporary state to show the form
              setActiveTab('profile');
            }}
            className="w-full bg-neutral-900 text-white rounded-2xl py-4 font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200"
          >
            Create Profile
          </button>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="mt-4 text-sm font-bold text-neutral-400 hover:text-neutral-600 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-neutral-900">Galaxy Toyota</h1>
          <p className="text-xs text-neutral-400">Digital Card Platform</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={18} />} label="Profile" />
          <NavItem active={activeTab === 'links'} onClick={() => setActiveTab('links')} icon={<Globe size={18} />} label="Social Links" />
          <NavItem active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<FileText size={18} />} label="Resources" />
          <NavItem active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Package size={18} />} label="Products" />
          <NavItem active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} icon={<Users size={18} />} label="Leads" />
          {isAdmin && (
            <NavItem active={false} onClick={() => navigate('/admin')} icon={<ShieldCheck size={18} />} label="Admin Panel" />
          )}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 text-neutral-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Welcome back, {employee?.name.split(' ')[0]}!</h2>
              <p className="text-neutral-500 mt-1">Manage your digital presence and track your engagement.</p>
            </div>
            {employee && (
              <div className="flex items-center gap-3">
                <a 
                  href={`/card/${employee.slug}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-2xl text-sm font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200"
                >
                  <ExternalLink size={18} />
                  View My Card
                </a>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <DashboardStat icon={<Eye className="text-blue-600" />} label="Views" value={analytics.filter(e => e.event_type === 'view').length} color="bg-blue-50" />
            <DashboardStat icon={<MousePointer2 className="text-purple-600" />} label="Clicks" value={analytics.filter(e => e.event_type === 'click').length} color="bg-purple-50" />
            <DashboardStat icon={<Users className="text-green-600" />} label="Leads" value={leads.length} color="bg-green-50" />
            <DashboardStat icon={<Share2 className="text-orange-600" />} label="Shares" value={analytics.filter(e => e.event_type === 'share').length} color="bg-orange-50" />
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] shadow-sm border border-neutral-200 p-6 md:p-10"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-900">
                {activeTab === 'profile' && <User size={24} />}
                {activeTab === 'links' && <Globe size={24} />}
                {activeTab === 'resources' && <FileText size={24} />}
                {activeTab === 'products' && <Package size={24} />}
                {activeTab === 'leads' && <Users size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900 capitalize">{activeTab} Management</h3>
                <p className="text-xs text-neutral-400">Configure your {activeTab} details below</p>
              </div>
            </div>

            {activeTab === 'profile' && (
              <form onSubmit={handleProfileUpdate} className="space-y-10">
                <div className="flex flex-col lg:flex-row gap-12 items-start">
                  <div className="w-full lg:w-fit flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-48 h-48 rounded-[3rem] bg-neutral-100 overflow-hidden border-8 border-white shadow-2xl shadow-neutral-200 transition-transform group-hover:scale-[1.02]">
                        {localPhotoPreview || employee?.photo ? (
                          <img src={localPhotoPreview || employee?.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <User size={64} />
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 w-14 h-14 bg-neutral-900 text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-all">
                        <Camera size={24} />
                        <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                      </label>
                    </div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Profile Photo</p>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <Input label="Full Name" value={profileForm.name} onChange={v => setProfileForm({...profileForm, name: v})} icon={<User size={16} />} />
                    <Input label="Designation" value={profileForm.designation} onChange={v => setProfileForm({...profileForm, designation: v})} icon={<Briefcase size={16} />} />
                    <Input label="Phone Number" value={profileForm.phone} onChange={v => setProfileForm({...profileForm, phone: v})} icon={<Phone size={16} />} />
                    <Input label="Email Address" value={profileForm.email} onChange={v => setProfileForm({...profileForm, email: v})} icon={<Mail size={16} />} />
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                            <Globe size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">Your Unique URL</p>
                            <p className="text-xs text-blue-600 font-medium">galaxytoyota.com/card/{profileForm.slug}</p>
                          </div>
                        </div>
                        <input 
                          type="text" 
                          value={profileForm.slug}
                          onChange={e => setProfileForm({...profileForm, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})}
                          className="bg-white border border-blue-200 rounded-xl px-4 py-2 text-sm font-bold text-neutral-900 focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
                          placeholder="your-slug"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">About Me</label>
                      <textarea 
                        value={profileForm.about}
                        onChange={e => setProfileForm({...profileForm, about: e.target.value})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[150px] leading-relaxed"
                        placeholder="Tell clients about your expertise and how you can help them..."
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-6 border-t border-neutral-100">
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-10 py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-xl shadow-neutral-200"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {isUpdating ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'links' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickAddLink icon={<Instagram />} label="Instagram" onClick={() => addLink('instagram', 'https://instagram.com/')} />
                  <QuickAddLink icon={<Linkedin />} label="LinkedIn" onClick={() => addLink('linkedin', 'https://linkedin.com/in/')} />
                  <QuickAddLink icon={<Twitter />} label="Twitter" onClick={() => addLink('twitter', 'https://twitter.com/')} />
                  <QuickAddLink icon={<Facebook />} label="Facebook" onClick={() => addLink('facebook', 'https://facebook.com/')} />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-900">Your Links</h3>
                  {links.length === 0 ? (
                    <p className="text-sm text-neutral-400 italic">No links added yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {links.map(link => (
                        <div key={link.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              {getLinkIcon(link.type)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-900 capitalize">{link.type}</p>
                              <p className="text-xs text-neutral-400 truncate max-w-[200px]">{link.url}</p>
                            </div>
                          </div>
                          <button onClick={() => deleteLink(link.id)} className="p-2 text-neutral-400 hover:text-red-600 transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AddResourceForm onAdd={addResource} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {resources.map(res => (
                    <div key={res.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          res.type === 'pdf' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {res.type === 'pdf' ? <FileText /> : <Video />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900">{res.title}</p>
                          <p className="text-xs text-neutral-400 uppercase">{res.type}</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          const { error } = await supabase.from('resources').delete().eq('id', res.id);
                          if (!error) setResources(resources.filter(r => r.id !== res.id));
                        }} 
                        className="p-2 text-neutral-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-8">
                <AddProductForm onAdd={addProduct} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <div key={product.id} className="bg-neutral-50 rounded-3xl overflow-hidden border border-neutral-100 group">
                      <div className="aspect-video bg-neutral-200 relative">
                        {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" />}
                        <button 
                          onClick={async () => {
                            const { error } = await supabase.from('products').delete().eq('id', product.id);
                            if (!error) setProducts(products.filter(p => p.id !== product.id));
                          }}
                          className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur rounded-xl text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-neutral-900">{product.name}</h4>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{product.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'leads' && (
              <div className="space-y-4">
                {leads.length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                    <p className="text-neutral-400">No leads captured yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {leads.map(lead => (
                      <div key={lead.id} className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-neutral-900 text-lg">{lead.name}</h4>
                            <p className="text-xs text-neutral-400">{new Date(lead.timestamp).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <a href={`tel:${lead.phone}`} className="p-2 bg-white rounded-xl text-neutral-600 hover:text-blue-600 shadow-sm"><Phone size={16} /></a>
                            <a href={`mailto:${lead.email}`} className="p-2 bg-white rounded-xl text-neutral-600 hover:text-blue-600 shadow-sm"><Mail size={16} /></a>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl text-sm text-neutral-600 border border-neutral-50">
                          {lead.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const DashboardStat = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm flex flex-col items-center text-center">
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", color)}>
      {icon}
    </div>
    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-bold text-neutral-900 tracking-tight">{value.toLocaleString()}</p>
  </div>
);

const NavItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm",
      active 
        ? "bg-neutral-900 text-white shadow-xl shadow-neutral-200" 
        : "text-neutral-500 hover:bg-neutral-100"
    )}
  >
    {icon}
    {label}
  </button>
);

const Input = ({ label, value, onChange, icon }: { label: string, value: string, onChange: (v: string) => void, icon: React.ReactNode }) => (
  <div className="w-full">
    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">{label}</label>
    <div className="relative">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400">
        {icon}
      </div>
      <input 
        type="text" 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 pl-12 pr-5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
      />
    </div>
  </div>
);

const QuickAddLink = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-white hover:shadow-md transition-all group"
  >
    <div className="text-neutral-400 group-hover:text-blue-600 transition-colors">
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</span>
  </button>
);

const AddResourceForm = ({ onAdd }: { onAdd: (type: 'pdf' | 'video', title: string, url: string) => void }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'pdf' | 'video'>('pdf');

  return (
    <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100 space-y-4 md:col-span-2">
      <h3 className="text-sm font-bold text-neutral-900">Add New Resource</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select 
          value={type} 
          onChange={e => setType(e.target.value as any)}
          className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none"
        >
          <option value="pdf">PDF Document</option>
          <option value="video">Video Link</option>
        </select>
        <input 
          placeholder="Title (e.g. Price List 2024)" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none"
        />
        <input 
          placeholder="URL (File or Video Link)" 
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none"
        />
      </div>
      <button 
        onClick={() => { onAdd(type, title, url); setTitle(''); setUrl(''); }}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
      >
        Add Resource
      </button>
    </div>
  );
};

const AddProductForm = ({ onAdd }: { onAdd: (name: string, description: string, image: string) => void }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [img, setImg] = useState('');

  return (
    <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100 space-y-4">
      <h3 className="text-sm font-bold text-neutral-900">Add Product/Service</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none" />
        <input placeholder="Image URL" value={img} onChange={e => setImg(e.target.value)} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none" />
        <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} className="md:col-span-2 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none min-h-[80px]" />
      </div>
      <button 
        onClick={() => { onAdd(name, desc, img); setName(''); setDesc(''); setImg(''); }}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
      >
        Add Product
      </button>
    </div>
  );
};

const getLinkIcon = (type: string) => {
  switch(type) {
    case 'instagram': return <Instagram size={20} className="text-pink-600" />;
    case 'linkedin': return <Linkedin size={20} className="text-blue-700" />;
    case 'twitter': return <Twitter size={20} className="text-blue-400" />;
    case 'facebook': return <Facebook size={20} className="text-blue-600" />;
    case 'github': return <Github size={20} className="text-neutral-900" />;
    case 'youtube': return <Youtube size={20} className="text-red-600" />;
    default: return <Globe size={20} className="text-neutral-400" />;
  }
};

export default Dashboard;
