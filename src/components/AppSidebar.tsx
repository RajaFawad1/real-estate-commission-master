import React from 'react';
import { Home, Users, Calculator, Layers, BarChart, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const menuItems = [
  { title: 'Analytics', icon: BarChart, tab: 'analytics' },
  { title: 'Property Management', icon: Home, tab: 'properties' },
  { title: 'Person Management', icon: Users, tab: 'people' },
  { title: 'Level Management', icon: Layers, tab: 'levels' },
  { title: 'Commission Calculator', icon: Calculator, tab: 'calculator' },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { theme, setTheme } = useTheme();
  const { open } = useSidebar();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Sidebar className="border-r border-border/40 backdrop-blur-sm">
      <SidebarContent>
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="text-lg font-bold px-4 mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.tab}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.tab)}
                    isActive={activeTab === item.tab}
                    className="transition-all duration-300 hover:translate-x-1 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
                  >
                    <item.icon className={`transition-transform duration-300 ${activeTab === item.tab ? 'scale-110' : ''}`} />
                    {open && <span className="animate-fade-in">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4">
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full justify-start gap-2 transition-all hover:scale-[1.02]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {open && <span>{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 transition-all hover:scale-[1.02]"
          >
            <LogOut className="h-4 w-4" />
            {open && <span>Logout</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
