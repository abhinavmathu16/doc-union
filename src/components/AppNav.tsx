import { NavLink } from "react-router-dom";
import { FileStack, ImageIcon, FileDown } from "lucide-react";

const links = [
  { to: "/", label: "PDF Merger", icon: FileStack },
  { to: "/pdf-compressor", label: "PDF Compressor", icon: FileDown },
  { to: "/image-resizer", label: "Image Resizer", icon: ImageIcon },
];

const AppNav = () => (
  <nav className="flex items-center justify-center gap-1 py-4">
    {links.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    ))}
  </nav>
);

export default AppNav;
