import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  teachers: { id: string; full_name: string }[];
  schools: string[];
  selectedTeacher: string;
  selectedSchool: string;
  onTeacherChange: (value: string) => void;
  onSchoolChange: (value: string) => void;
  onClearFilters: () => void;
}

export function SearchFilters({
  searchQuery,
  onSearchChange,
  teachers,
  schools,
  selectedTeacher,
  selectedSchool,
  onTeacherChange,
  onSchoolChange,
  onClearFilters,
}: SearchFiltersProps) {
  const hasFilters = selectedTeacher || selectedSchool || searchQuery;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 sm:h-10 text-sm sm:text-base"
          />
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={selectedTeacher} onValueChange={onTeacherChange}>
            <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 sm:h-10 text-sm">
              <Filter className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSchool} onValueChange={onSchoolChange}>
            <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 sm:h-10 text-sm">
              <SelectValue placeholder="School" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school} value={school}>
                  {school}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">
            Filters:
          </span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {searchQuery}
            </Badge>
          )}
          {selectedTeacher && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {selectedTeacher === "all"
                ? "All Teachers"
                : teachers.find((t) => t.id === selectedTeacher)?.full_name ||
                  "Unknown Teacher"}
            </Badge>
          )}
          {selectedSchool && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {selectedSchool === "all" ? "All Schools" : selectedSchool}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-6 gap-1 px-2 text-xs"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
