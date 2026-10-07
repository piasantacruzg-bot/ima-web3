import ProjectMedia from "@/components/ProjectMedia";
import type { TeamMember as Member } from "@/content/team";
import type { Locale } from "@/lib/i18n";

export default function TeamMember({ member, lang }: { member: Member; lang: Locale }) {
  return (
    <article className="team__member">
      <ProjectMedia media={member.portrait} lang={lang} sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw" />
      <div className="reveal">
        <h3 className="member__name">{member.name}</h3>
        <p className="meta member__role">{member.role[lang]}</p>
        <div className="member__bio">
          {member.bio[lang].map((p, i) => (
            <p className="body muted" key={i}>
              {p}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
