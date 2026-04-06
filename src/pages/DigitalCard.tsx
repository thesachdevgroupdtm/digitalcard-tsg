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
    <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-6 px-2">Products & Services</h3>
    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x">
      {products.map(product => (
        <motion.div 
          whileHover={{ y: -5 }}
          key={product.id} 
          className="min-w-[280px] bg-neutral-900/40 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/5 hover:border-[#EB0A1E]/30 transition-all snap-center shadow-xl"
        >
          <div className="aspect-[4/3] bg-neutral-800/50">
            {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />}
          </div>
          <div className="p-6">
            <h4 className="font-bold text-lg mb-2 text-white">{product.name}</h4>
            <p className="text-neutral-400 text-xs leading-relaxed line-clamp-2">{product.description}</p>
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
      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#EB0A1E]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#EB0A1E]/10 blur-[120px] rounded-full" />
        <div className="absolute top-[30%] right-[10%] w-[20%] h-[20%] bg-[#EB0A1E]/5 blur-[80px] rounded-full" />
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
      <div className="relative h-[40vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EB0A1E]/20 via-black/60 to-black z-10" />
        {employee.photo ? (
          <motion.img 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            src={employee.photo} 
            alt={employee.name} 
            className="w-full h-full object-cover blur-xl" 
          />
        ) : (
          <div className="w-full h-full bg-neutral-900" />
        )}
      </div>

      <div className="max-w-md mx-auto px-6 -mt-32 relative z-20 pb-32">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/40 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#EB0A1E] to-transparent opacity-50" />
          
          <div className="relative inline-block mb-8">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="w-36 h-36 rounded-full bg-neutral-800 overflow-hidden border-4 border-neutral-900 shadow-[0_0_30px_rgba(235,10,30,0.3)] mx-auto relative z-10"
            >
              {employee.photo ? (
                <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-700">
                  <User size={72} />
                </div>
              )}
            </motion.div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-[#EB0A1E]/20 blur-xl -z-0"
            />
            <div className="absolute -bottom-1 -right-1 bg-[#EB0A1E] p-2.5 rounded-full shadow-xl border-4 border-neutral-900 z-20">
              <CheckCircle2 size={18} className="text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight mb-2 text-white">{employee.name}</h1>
          <p className="text-neutral-400 font-bold text-xs uppercase tracking-[0.4em] mb-6">{employee.designation}</p>
          
          <div className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/5">
            <p className="text-neutral-400 text-sm leading-relaxed italic">"{employee.about || 'Welcome to my digital business card.'}"</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ActionButton icon={<Phone />} label="Call" href={`tel:${employee.phone}`} onClick={() => trackClick('call')} />
            <ActionButton icon={<Mail />} label="Email" href={`mailto:${employee.email}`} onClick={() => trackClick('email')} />
            <ActionButton icon={<MessageSquare />} label="WhatsApp" href={`https://wa.me/${employee.phone.replace(/\D/g,'')}?text=${encodeURIComponent("Hi, I found your digital card and would like to connect.")}`} onClick={() => trackClick('whatsapp')} />
          </div>
        </motion.div>

        {/* CTA Section */}
        <div className="mt-8 space-y-3">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadVCard}
            className="w-full flex items-center justify-between bg-gradient-to-r from-[#EB0A1E] to-[#c40819] text-white p-5 rounded-full font-bold text-sm group transition-all shadow-xl shadow-[#EB0A1E]/20 relative overflow-hidden"
          >
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
            />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Download size={20} />
              </div>
              Save to Contacts
            </div>
            <ArrowRight size={18} className="text-white/50 group-hover:translate-x-1 transition-transform relative z-10" />
          </motion.button>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={shareCard}
              className="flex items-center justify-center gap-3 bg-neutral-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-full font-bold text-sm hover:bg-neutral-800 transition-all shadow-lg"
            >
              <Share2 size={18} className="text-[#EB0A1E]" />
              Share
            </button>
            <button 
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-3 bg-neutral-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-full font-bold text-sm hover:bg-neutral-800 transition-all shadow-lg"
            >
              {copySuccess ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} className="text-neutral-400" />}
              {copySuccess ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="mt-12 bg-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center">
          <h3 className="text-black text-xs font-black uppercase tracking-[0.3em] mb-6">Scan to Save Contact</h3>
          <div className="p-4 bg-neutral-50 rounded-3xl border border-neutral-100 shadow-inner">
            <QRCodeSVG 
              value={window.location.href} 
              size={160} 
              includeMargin={false}
              level="H"
            />
          </div>
          <p className="text-neutral-400 text-[10px] mt-6 font-bold uppercase tracking-widest">Digital Business Card</p>
        </div>

        {/* Social Links */}
        {links.length > 0 && (
          <div className="mt-12">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-6 px-2">Digital Presence</h3>
            <div className="grid grid-cols-4 gap-4">
              {links.map(link => (
                <motion.a 
                  whileHover={{ y: -5, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  key={link.id} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackClick(`social_${link.type}`)}
                  className="aspect-square bg-neutral-900/40 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center border border-white/10 hover:bg-neutral-800 hover:border-[#EB0A1E]/50 hover:shadow-[0_0_15px_rgba(235,10,30,0.2)] transition-all"
                >
                  {getLinkIcon(link.type)}
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        {products.length > 0 && (
          <Suspense fallback={<div className="h-40 bg-neutral-900 animate-pulse rounded-3xl mt-12" />}>
            <ProductSection products={products} />
          </Suspense>
        )}

        {/* Resources Section */}
        {resources.length > 0 && (
          <div className="mt-12">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-6 px-2">Documents & Media</h3>
            <div className="space-y-3">
              {resources.map(res => (
                <motion.a 
                  whileHover={{ x: 5 }}
                  key={res.id} 
                  href={res.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackClick(`resource_${res.type}`)}
                  className="flex items-center justify-between p-6 bg-neutral-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 hover:bg-neutral-800 hover:border-[#EB0A1E]/30 transition-all group shadow-lg"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center",
                      res.type === 'pdf' ? "bg-red-500/10 text-red-500" : "bg-[#EB0A1E]/10 text-[#EB0A1E]"
                    )}>
                      {res.type === 'pdf' ? <FileText size={24} /> : <Video size={24} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm group-hover:text-[#EB0A1E] transition-colors text-white">{res.title}</p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">{res.type}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-neutral-700 group-hover:text-white transition-all" />
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* Inquiry Form */}
        <div className="mt-12 bg-neutral-900/40 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
          <h3 className="text-2xl font-black mb-2 text-white">Get in Touch</h3>
          <p className="text-neutral-500 text-sm mb-8 leading-relaxed">Have a question? Send me a message and I'll respond shortly.</p>
          
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="font-bold text-xl mb-2 text-white">Message Sent!</h4>
                <p className="text-neutral-500 text-sm">Thank you for reaching out. I'll be in touch soon.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-8 text-[#EB0A1E] text-sm font-bold uppercase tracking-widest hover:text-[#c40819] transition-colors"
                >
                  Send Another
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="space-y-4">
                  <FormInput 
                    required
                    placeholder="Your Name" 
                    value={leadForm.name}
                    onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                  />
                  <div className="grid grid-cols-1 gap-4">
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
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-[#EB0A1E] focus:bg-white/10 transition-all min-h-[140px] resize-none text-white"
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-[#EB0A1E] text-white py-5 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-[#c40819] transition-all shadow-xl shadow-[#EB0A1E]/20"
                >
                  <Send size={18} />
                  Send Message
                </motion.button>
              </form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <div className="w-12 h-1 bg-gradient-to-r from-transparent via-[#EB0A1E]/30 to-transparent mx-auto mb-8" />
          <p className="text-neutral-600 text-[10px] uppercase tracking-[0.5em] mb-4">Official Digital Card of</p>
          <h2 className="text-2xl font-black text-white/10 tracking-tighter italic">GALAXY TOYOTA</h2>
          <p className="text-neutral-700 text-[10px] mt-8">© 2026 All Rights Reserved</p>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-12 max-w-sm w-full relative text-center shadow-2xl"
            >
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-8 right-8 p-2 text-neutral-300 hover:text-neutral-900 transition-all"
              >
                <X size={28} />
              </button>
              <h3 className="text-black text-2xl font-black mb-2">Scan Me</h3>
              <p className="text-neutral-500 text-sm mb-10">Point your camera to instantly view my digital card.</p>
              
              <div className="bg-neutral-50 p-8 rounded-[2.5rem] inline-block mb-10 shadow-inner border border-neutral-100">
                <QRCodeSVG 
                  value={window.location.href} 
                  size={200} 
                  includeMargin={false}
                  level="H"
                />
              </div>
              
              <div className="space-y-1">
                <p className="text-black font-bold text-lg">{employee.name}</p>
                <p className="text-neutral-400 text-xs uppercase tracking-widest">{employee.designation}</p>
              </div>

              <button 
                onClick={shareToWhatsApp}
                className="mt-10 w-full bg-green-500 text-white py-4 rounded-full font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
              >
                <MessageSquare size={18} />
                Share on WhatsApp
              </button>
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

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props}
    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-[#EB0A1E] focus:bg-white/10 transition-all text-white placeholder:text-neutral-600"
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
