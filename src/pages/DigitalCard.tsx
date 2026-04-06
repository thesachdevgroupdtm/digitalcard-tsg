import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabasePublic } from '../supabase';
import { Employee, Link, Resource, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Download, 
  Share2, 
  QrCode, 
  ChevronRight, 
  FileText, 
  Video, 
  Send,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Github,
  Youtube,
  CheckCircle2,
  X,
  Copy,
  ExternalLink,
  User,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import VCard from 'vcf';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Lazy load sections for performance
const ProductSection = lazy(() => Promise.resolve({ default: ({ products }: { products: Product[] }) => (
  <div className="mt-12">
    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mb-6 px-2">Products & Services</h3>
    <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar snap-x px-2">
      {products.map(product => (
        <motion.div 
          whileHover={{ y: -10 }}
          key={product.id} 
          className="min-w-[300px] bg-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/10 hover:border-[#EB0A1E]/30 transition-all snap-center shadow-2xl group"
        >
          <div className="aspect-[4/3] bg-neutral-900 overflow-hidden">
            {product.image && (
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                loading="lazy" 
              />
            )}
          </div>
          <div className="p-8">
            <h4 className="font-black text-xl mb-3 text-white group-hover:text-[#EB0A1E] transition-colors">{product.name}</h4>
            <p className="text-neutral-500 text-sm leading-relaxed line-clamp-3 font-medium">{product.description}</p>
            <div className="mt-6 flex items-center gap-2 text-[#EB0A1E] font-black text-[10px] uppercase tracking-widest">
              View Details <ArrowRight size={14} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
) }));

const DigitalCard = () => {
  const { slug } = useParams<{ slug: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    if (!slug) {
      console.log("Slug is missing from URL");
      setLoading(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    console.log("Slug received:", slug);

    const fetchData = async () => {
      console.log("fetchData function called for slug:", slug);
      try {
        const cleanSlug = slug?.trim().toLowerCase();
        console.log("Cleaned slug:", cleanSlug);
        
        console.log("Calling Supabase for employee data...");
        const { data, error } = await supabasePublic
          .from('employees')
          .select('*')
          .eq('slug', cleanSlug)
          .limit(1);

        console.log("Supabase response - Data:", data, "Error:", error);

        if (!isMounted) return;

        if (error) {
          console.error('Fetch Error:', error);
          setEmployee(null);
          setLoading(false);
          return;
        }

        const empData = data?.[0] || null;

        if (!empData) {
          console.log("No employee found for slug:", cleanSlug);
          setEmployee(null);
          setLoading(false);
          return;
        }

        console.log("Employee data found:", empData.name);
        setEmployee(empData as Employee);

        // Track view
        try {
          await supabasePublic.from('analytics').insert([{
            employee_id: empData.id,
            event_type: 'view',
            created_at: new Date().toISOString()
          }]);
        } catch (trackErr) {
          console.error("View tracking failed:", trackErr);
        }

        if (!isMounted) return;

        // Fetch related data
        console.log("Fetching related data (links, resources, products)...");
        const [linksRes, resourcesRes, productsRes] = await Promise.all([
          supabasePublic.from('links').select('*').eq('employee_id', empData.id),
          supabasePublic.from('resources').select('*').eq('employee_id', empData.id),
          supabasePublic.from('products').select('*').eq('employee_id', empData.id)
        ]);

        if (!isMounted) return;

        if (linksRes.data) setLinks(linksRes.data as Link[]);
        if (resourcesRes.data) setResources(resourcesRes.data as Resource[]);
        if (productsRes.data) setProducts(productsRes.data as Product[]);

        console.log("All data fetched successfully");
        setLoading(false);
      } catch (err) {
        console.error("Error loading card:", err);
        if (isMounted) {
          setEmployee(null);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [slug]);

  const trackClick = async (type: string) => {
    if (!employee) return;
    try {
      await supabasePublic.from('analytics').insert([{
        employee_id: employee.id,
        event_type: 'click',
        created_at: new Date().toISOString(),
        metadata: { button: type }
      }]);
    } catch (err) {
      console.error("Tracking error:", err);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const { error } = await supabasePublic.from('leads').insert([{
        employee_id: employee.id,
        ...leadForm,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setSubmitted(true);
      setLeadForm({ name: '', phone: '', email: '', message: '' });
    } catch (err) {
      toast.error("Failed to send message. Please try again.");
    }
  };

  const downloadVCard = () => {
    if (!employee) return;
    trackClick('vcard');
    const card = new VCard();
    card.set('fn', employee.name || 'User');
    card.set('n', `${(employee?.name || "User").split(" ").reverse().join(';')};;;;`);
    card.set('title', employee.designation);
    card.set('tel', employee.phone, { type: 'cell' });
    card.set('email', employee.email, { type: 'work' });
    card.set('org', 'Galaxy Toyota');
    card.set('url', window.location.href);
    card.set('note', employee.about);
    
    const blob = new Blob([card.toString()], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${employee.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
  };

  const shareCard = async () => {
    if (!employee) return;
    trackClick('share');
    const shareData = {
      title: `${employee.name} | Galaxy Toyota`,
      text: `Connect with ${employee.name} from Galaxy Toyota. View digital business card here:`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!employee) return;
    trackClick('whatsapp_share');
    const text = encodeURIComponent(`Hi, I found your digital card and would like to connect.\n\n*${employee.name}* - ${employee.designation}\nGalaxy Toyota\n\nView digital business card:\n${window.location.href}`);
    window.open(`https://wa.me/${employee.phone.replace(/\D/g,'')}?text=${text}`, '_blank');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="w-12 h-12 border-4 border-[#EB0A1E] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-neutral-500 text-sm font-medium animate-pulse">Loading Premium Experience...</p>
    </div>
  );

  if (!employee || employee.status === 'inactive') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
      <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
        <X size={40} className="text-[#EB0A1E]" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{employee?.status === 'inactive' ? 'Card Inactive' : 'Card Not Found'}</h1>
      <p className="text-neutral-500 text-sm mb-8">
        {employee?.status === 'inactive' 
          ? 'This digital business card has been temporarily deactivated.' 
          : 'The digital card you are looking for doesn\'t exist or has been moved.'}
      </p>
      <a href="/" className="bg-[#EB0A1E] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#c40819] transition-all shadow-lg shadow-[#EB0A1E]/20">Go Home</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#EB0A1E] selection:text-white relative overflow-x-hidden">
      {/* Premium Layered Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Base Black Layer */}
        <div className="absolute inset-0 bg-black" />
        
        {/* Red Radial Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#EB0A1E]/15 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#EB0A1E]/15 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        
        {/* Subtle Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
        <motion.a 
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          href={`tel:${employee.phone}`}
          onClick={() => trackClick('fab_call')}
          className="w-14 h-14 bg-[#EB0A1E] rounded-full flex items-center justify-center shadow-2xl shadow-[#EB0A1E]/30 border border-white/10"
        >
          <Phone size={24} />
        </motion.a>
        <motion.a 
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          href={`https://wa.me/${employee.phone.replace(/\D/g,'')}?text=${encodeURIComponent("Hi, I found your digital card and would like to connect.")}`}
          onClick={() => trackClick('fab_whatsapp')}
          className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 border border-white/10"
        >
          <MessageSquare size={24} />
        </motion.a>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
        <div className="bg-neutral-900/60 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex gap-2 shadow-2xl">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={downloadVCard}
            className="flex-1 bg-[#EB0A1E] text-white py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#EB0A1E]/20"
          >
            <Download size={18} />
            Save Contact
          </motion.button>
          <button 
            onClick={shareCard}
            className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[45vh] overflow-hidden">
        {/* Diagonal Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-[#EB0A1E]/40 z-10" />
        
        {/* Brand Label */}
        <div className="absolute top-12 left-0 right-0 z-20 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/40 text-[10px] font-black tracking-[0.8em] uppercase"
          >
            Galaxy Toyota
          </motion.div>
        </div>

        {employee.photo ? (
          <motion.img 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.3 }}
            transition={{ duration: 2 }}
            src={employee.photo} 
            alt={employee.name} 
            className="w-full h-full object-cover grayscale" 
          />
        ) : (
          <div className="w-full h-full bg-neutral-900" />
        )}
      </div>

      <div className="max-w-md mx-auto px-6 -mt-40 relative z-20 pb-32">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="relative mb-8">
            {/* Animated Glow behind profile */}
            <motion.div 
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-[#EB0A1E] blur-[40px] -z-10"
            />
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -10, 0] 
              }}
              transition={{ 
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 },
                y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-40 h-40 rounded-full bg-neutral-900 border-[6px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10"
            >
              {employee.photo ? (
                <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-700">
                  <User size={80} />
                </div>
              )}
            </motion.div>
            
            <div className="absolute -bottom-1 -right-1 bg-[#EB0A1E] p-3 rounded-full shadow-xl border-4 border-black z-20">
              <CheckCircle2 size={20} className="text-white" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-black tracking-tight mb-2 text-white drop-shadow-sm">{employee.name}</h1>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[#EB0A1E] font-black text-xs uppercase tracking-[0.4em]">{employee.designation}</p>
              <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Galaxy Toyota</p>
            </div>
          </motion.div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 gap-4 mb-12">
          <motion.button 
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(235, 10, 30, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadVCard}
            className="w-full flex items-center justify-center gap-4 bg-gradient-to-r from-[#EB0A1E] to-[#8a0612] text-white py-5 rounded-full font-black text-sm transition-all shadow-2xl shadow-[#EB0A1E]/30"
          >
            <Download size={20} />
            SAVE CONTACT
          </motion.button>
          
          <div className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={shareCard}
              className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 py-5 rounded-full font-black text-xs uppercase tracking-widest transition-all"
            >
              <Share2 size={18} className="text-[#EB0A1E]" />
              Share
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 py-5 rounded-full font-black text-xs uppercase tracking-widest transition-all"
            >
              {copySuccess ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} className="text-neutral-400" />}
              {copySuccess ? 'Copied' : 'Link'}
            </motion.button>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="space-y-4 mb-12">
          <ContactCard 
            icon={<Phone className="text-white" />} 
            label="Phone" 
            value={employee.phone} 
            href={`tel:${employee.phone}`}
            onClick={() => trackClick('call_card')}
            iconBg="bg-blue-600"
          />
          <ContactCard 
            icon={<Mail className="text-white" />} 
            label="Email" 
            value={employee.email} 
            href={`mailto:${employee.email}`}
            onClick={() => trackClick('email_card')}
            iconBg="bg-purple-600"
          />
          <ContactCard 
            icon={<MessageSquare className="text-white" />} 
            label="WhatsApp" 
            value="Message me" 
            href={`https://wa.me/${employee.phone.replace(/\D/g,'')}?text=${encodeURIComponent("Hi, I found your digital card and would like to connect.")}`}
            onClick={() => trackClick('whatsapp_card')}
            iconBg="bg-green-600"
          />
        </div>

        {/* About Section */}
        <div className="mb-12">
          <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mb-4 px-2">About Me</h3>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border-l-4 border-[#EB0A1E] shadow-xl">
            <p className="text-neutral-400 text-sm leading-[1.8] font-medium">
              {employee.about || 'Passionate professional at Galaxy Toyota, dedicated to providing exceptional service and automotive expertise to our valued clients.'}
            </p>
          </div>
        </div>

        {/* Social Links */}
        {links.length > 0 && (
          <div className="mb-12">
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mb-6 px-2">Social Connect</h3>
            <div className="flex flex-wrap justify-center gap-6">
              {links.map(link => (
                <motion.a 
                  whileHover={{ scale: 1.2, boxShadow: '0 0 20px rgba(235, 10, 30, 0.3)' }}
                  whileTap={{ scale: 0.9 }}
                  key={link.id} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackClick(`social_${link.type}`)}
                  className="w-14 h-14 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 hover:border-[#EB0A1E]/50 transition-all"
                >
                  {getLinkIcon(link.type)}
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* QR Code Section */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white rounded-[2rem] p-10 shadow-2xl flex flex-col items-center text-center border-2 border-transparent hover:border-[#EB0A1E]/10 transition-all"
        >
          <h3 className="text-black text-sm font-black uppercase tracking-[0.3em] mb-8">Scan to Connect</h3>
          <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 shadow-inner">
            <QRCodeSVG 
              value={window.location.href} 
              size={180} 
              includeMargin={false}
              level="H"
            />
          </div>
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-black font-black text-xs uppercase tracking-widest">Digital Business Card</p>
            <p className="text-neutral-400 text-[9px] font-bold uppercase tracking-[0.2em]">Galaxy Toyota Official</p>
          </div>
        </motion.div>

        {/* Products Section */}
        {products.length > 0 && (
          <Suspense fallback={<div className="h-40 bg-neutral-900 animate-pulse rounded-3xl mt-12" />}>
            <ProductSection products={products} />
          </Suspense>
        )}

        {/* Resources Section */}
        {resources.length > 0 && (
          <div className="mt-12">
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mb-6 px-2">Documents & Media</h3>
            <div className="space-y-4">
              {resources.map(res => (
                <motion.a 
                  whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  key={res.id} 
                  href={res.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackClick(`resource_${res.type}`)}
                  className="flex items-center justify-between p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 hover:border-[#EB0A1E]/30 transition-all group shadow-xl"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                      res.type === 'pdf' ? "bg-red-600 text-white" : "bg-[#EB0A1E] text-white"
                    )}>
                      {res.type === 'pdf' ? <FileText size={24} /> : <Video size={24} />}
                    </div>
                    <div>
                      <p className="font-black text-base group-hover:text-[#EB0A1E] transition-colors text-white">{res.title}</p>
                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">{res.type}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#EB0A1E] transition-all">
                    <ChevronRight size={18} className="text-neutral-600 group-hover:text-white transition-all" />
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* Inquiry Form */}
        <div className="mt-12 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#EB0A1E]" />
          <h3 className="text-3xl font-black mb-2 text-white">Get in Touch</h3>
          <p className="text-neutral-500 text-sm mb-10 leading-relaxed font-medium">Have a question? Send me a message and I'll respond shortly.</p>
          
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                  <CheckCircle2 size={48} />
                </div>
                <h4 className="font-black text-2xl mb-3 text-white">Message Sent!</h4>
                <p className="text-neutral-500 text-sm font-medium">Thank you for reaching out. I'll be in touch soon.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-10 bg-white/5 px-8 py-3 rounded-full text-[#EB0A1E] text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Send Another
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-5">
                <div className="space-y-5">
                  <FormInput 
                    required
                    placeholder="Your Name" 
                    value={leadForm.name}
                    onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                  />
                  <div className="grid grid-cols-1 gap-5">
                    <FormInput 
                      required
                      placeholder="Phone Number" 
                      value={leadForm.phone}
                      onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    />
                    <FormInput 
                      required
                      type="email"
                      placeholder="Email Address" 
                      value={leadForm.email}
                      onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    />
                  </div>
                  <textarea 
                    required
                    placeholder="How can I help you?" 
                    value={leadForm.message}
                    onChange={e => setLeadForm({...leadForm, message: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm outline-none focus:border-[#EB0A1E] focus:bg-white/10 transition-all min-h-[160px] resize-none text-white font-medium placeholder:text-neutral-700"
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(235, 10, 30, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#EB0A1E] to-[#8a0612] text-white py-6 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-2xl shadow-[#EB0A1E]/30"
                >
                  <Send size={20} />
                  Send Message
                </motion.button>
              </form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-24 text-center">
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#EB0A1E] to-transparent mx-auto mb-10" />
          <p className="text-neutral-600 text-[9px] font-black uppercase tracking-[0.6em] mb-6">Official Digital Card</p>
          <h2 className="text-3xl font-black text-white/5 tracking-[-0.05em] uppercase italic">Galaxy Toyota</h2>
          <p className="text-neutral-800 text-[9px] font-bold mt-10 uppercase tracking-widest">© 2026 All Rights Reserved</p>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3rem] p-12 max-w-sm w-full relative text-center shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-10 right-10 p-2 text-neutral-300 hover:text-black transition-all"
              >
                <X size={32} />
              </button>
              <h3 className="text-black text-3xl font-black mb-3 tracking-tight">Scan to Connect</h3>
              <p className="text-neutral-500 text-sm mb-12 font-medium">Point your camera to instantly view my digital card.</p>
              
              <div className="bg-neutral-50 p-10 rounded-[3rem] inline-block mb-12 shadow-inner border border-neutral-100">
                <QRCodeSVG 
                  value={window.location.href} 
                  size={220} 
                  includeMargin={false}
                  level="H"
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-black font-black text-2xl tracking-tight">{employee.name}</p>
                <p className="text-[#EB0A1E] font-black text-[10px] uppercase tracking-[0.3em]">{employee.designation}</p>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={shareToWhatsApp}
                className="mt-12 w-full bg-green-500 text-white py-5 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl shadow-green-500/30"
              >
                <MessageSquare size={20} />
                Share on WhatsApp
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActionButton = ({ icon, label, href, onClick }: { icon: React.ReactNode, label: string, href: string, onClick: () => void }) => (
  <motion.a 
    whileHover={{ y: -5 }}
    whileTap={{ scale: 0.95 }}
    href={href}
    onClick={onClick}
    className="flex flex-col items-center gap-3 group"
  >
    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:bg-[#EB0A1E] group-hover:border-[#EB0A1E] group-hover:shadow-[0_0_20px_rgba(235,10,30,0.4)] transition-all duration-300">
      <div className="text-neutral-400 group-hover:text-white transition-colors">
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 group-hover:text-white transition-colors">{label}</span>
  </motion.a>
);

const ContactCard = ({ icon, label, value, href, onClick, iconBg }: { icon: React.ReactNode, label: string, value: string, href: string, onClick: () => void, iconBg: string }) => (
  <motion.a 
    whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.08)' }}
    whileTap={{ scale: 0.98 }}
    href={href}
    onClick={onClick}
    className="flex items-center gap-5 p-5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 transition-all shadow-lg group"
  >
    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", iconBg)}>
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </div>
    <div className="flex-1">
      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-white group-hover:text-[#EB0A1E] transition-colors">{value}</p>
    </div>
    <ChevronRight size={18} className="text-neutral-700 group-hover:text-white transition-all" />
  </motion.a>
);

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props}
    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm outline-none focus:border-[#EB0A1E] focus:bg-white/10 transition-all text-white font-medium placeholder:text-neutral-700"
  />
);

const getLinkIcon = (type: string) => {
  const size = 28;
  switch(type) {
    case 'instagram': return <Instagram size={size} className="text-white" />;
    case 'linkedin': return <Linkedin size={size} className="text-white" />;
    case 'twitter': return <Twitter size={size} className="text-white" />;
    case 'facebook': return <Facebook size={size} className="text-white" />;
    case 'github': return <Github size={size} className="text-white" />;
    case 'youtube': return <Youtube size={size} className="text-white" />;
    default: return <Globe size={size} className="text-white" />;
  }
};

export default DigitalCard;
