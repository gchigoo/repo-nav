let meta = #{
    name: "rolekit-host-bridge",
    description: "Execute one RepoNav RoleKit task through a Grok Build host subagent",
    phases: [
        #{ title: "Prepare", detail: "validate arguments and assemble the host prompt" },
        #{ title: "Execute", detail: "run exactly one RoleKit task through a subagent" },
        #{ title: "Summarize", detail: "return a compact host receipt summary" },
    ],
};

let host_result_schema = #{
    "type": "object",
    "required": ["verdict", "summary", "evidence"],
    "additionalProperties": false,
    "properties": #{
        "verdict": #{ "type": "string", "enum": ["completed", "blocked", "failed"] },
        "summary": #{ "type": "string" },
        "changed_files": #{ "type": "array", "items": #{ "type": "string" } },
        "checks": #{ "type": "array", "items": #{ "type": "string" } },
        "evidence": #{ "type": "array", "items": #{ "type": "string" } },
        "risks": #{ "type": "array", "items": #{ "type": "string" } },
    },
};

let task_file = if args == () { () } else { args.task_file };
if task_file == () { pause("verification", "Pass args.task_file, for example {\"task_file\":\"rolekit/tasks/examples/review-change.yaml\",\"role\":\"reviewer\",\"capability_mode\":\"read-only\"}."); }

let role = if args.role == () { "reviewer" } else { args.role };
let capability = if args.capability_mode == () { "read-only" } else { args.capability_mode };
let objective = if args.objective == () { "Execute the supplied RepoNav RoleKit task." } else { args.objective };

phase("Prepare");
let prompt = "You are the Grok Build host bridge for RepoNav's RoleKit-first workflow. ";
prompt += "Treat rolekit.yaml and the named task packet as the source of truth. ";
prompt += "Work from the repository root. First read rolekit.yaml, then read the task file ";
prompt += json_encode(task_file);
prompt += ". Execute exactly one task for role ";
prompt += json_encode(role);
prompt += ". Do not expand scope beyond the task allowedPaths, constraints, and acceptanceCriteria. ";
prompt += "If the task is read-only, do not modify files. If the task requires writes, summarize changed files and checks. ";
prompt += "Return only the requested structured object. Objective: ";
prompt += json_encode(objective);

phase("Execute");
let result = agent(prompt, #{
    label: "rolekit-host:" + role,
    capability_mode: capability,
    output_schema: host_result_schema,
});

phase("Summarize");
if result != () && result.success && result.output.verdict != () {
    complete(#{
        task_file: task_file,
        role: role,
        capability_mode: capability,
        host_result: result.output,
    });
}
complete(#{
    task_file: task_file,
    role: role,
    capability_mode: capability,
    host_result: #{
        verdict: "failed",
        summary: "Host bridge subagent failed or returned unusable output.",
        evidence: [],
        risks: ["No RoleKit host receipt can be trusted without a successful structured host result."],
    },
});
